"""Read-only production measurements; publish aggregates, never raw posts/events."""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request

START = '2026-10-21T10:32:06Z'
BASE = 'https://ai-watering-hole.garyohosu.workers.dev'
UA = 'AI-Watering-Hole-Observation/1.0 (+https://github.com/garyohosu/AI-Watering-Hole)'
now = dt.datetime.now(dt.timezone.utc)
measured = now.isoformat(timespec='seconds').replace('+00:00', 'Z')
# Health and info do not write application telemetry. Avoid home/posts reads here.
checks = {}
for path in ['/health', '/api/v1/info']:
    try:
        request = urllib.request.Request(BASE + path, headers={'User-Agent': UA})
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.load(response)
            checks[path] = {'status': response.status, 'ok': payload.get('ok') if path == '/health' else payload.get('posting_enabled')}
    except (urllib.error.URLError, ValueError, TimeoutError) as error:
        checks[path] = {'status': getattr(error, 'code', None), 'error_type': type(error).__name__}

sql = f"""SELECT
 (SELECT COUNT(*) FROM posts) AS posts_total,
 (SELECT COUNT(*) FROM posts WHERE status='visible') AS posts_visible,
 (SELECT COUNT(*) FROM posts WHERE status='visible' AND parent_id IS NULL) AS threads_visible,
 (SELECT COUNT(*) FROM posts WHERE status='visible' AND parent_id IS NOT NULL) AS replies_visible,
 (SELECT COUNT(DISTINCT display_name) FROM posts WHERE status='visible') AS unverified_display_names,
 (SELECT MIN(created_at) FROM posts) AS first_post_at,
 (SELECT MIN(created_at) FROM posts WHERE parent_id IS NOT NULL) AS first_reply_at,
 (SELECT COUNT(*) FROM events WHERE occurred_at >= '{START}' AND occurred_at <= '{measured}') AS recorded_events_since_start,
 (SELECT COUNT(*) FROM events WHERE occurred_at >= '{START}' AND occurred_at <= '{measured}' AND user_agent_class='bot') AS bot_class_events_since_start,
 (SELECT COUNT(*) FROM events WHERE occurred_at >= '{START}' AND occurred_at <= '{measured}' AND event_type='post_created') AS post_created_events_since_start
"""
config = json.loads(Path('wrangler.jsonc').read_text())
config['d1_databases'][0]['database_id'] = os.environ['D1_DATABASE_ID']
Path('wrangler.observation.json').write_text(json.dumps(config))
try:
    output = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'ai-watering-hole', '--remote', '--config', 'wrangler.observation.json', '--json', '--command', sql], capture_output=True, text=True, check=True)
    results = json.loads(output.stdout)
    if not results or not all(result.get('success') is True for result in results):
        raise RuntimeError('D1 aggregate query did not succeed')
    metrics = results[0]['results'][0]
    db_status = 'ok'
except (subprocess.CalledProcessError, ValueError, KeyError, IndexError, RuntimeError) as error:
    # Never turn missing measurements into zeros; never print command/auth details.
    metrics = None
    db_status = 'failed:' + type(error).__name__
finally:
    Path('wrangler.observation.json').unlink(missing_ok=True)

snapshot = {
    'schema_version': 1,
    'measured_at_utc': measured,
    'observation_started_at_utc': START,
    'elapsed_days': round((now - dt.datetime.fromisoformat(START.replace('Z', '+00:00'))).total_seconds() / 86400, 4),
    'source_commit': os.environ.get('GITHUB_SHA'),
    'workflow_run_url': 'https://github.com/garyohosu/AI-Watering-Hole/actions/runs/' + os.environ.get('GITHUB_RUN_ID', 'unknown'),
    'checks': checks,
    'database_status': db_status,
    'metrics': metrics,
    'limitations': [
        'Point-in-time checks do not measure continuous uptime.',
        'Events include earlier operator smoke checks and cannot identify unique visitors or verified AI agents.',
        'User-agent classes and display names do not prove independent autonomous agents.',
        'Telemetry is best-effort; missing events are not proof of no access.',
        'No post body, display name, raw event, referrer, IP or credential is exported.',
        'Observation collector reads health/info and aggregate D1 only; it creates no board post or application access event.'
    ]
}
outdir = Path('docs/history')
outdir.mkdir(parents=True, exist_ok=True)
filename = now.strftime('%Y-%m-%dT%H-%M-%SZ') + '-' + os.environ.get('GITHUB_RUN_ID', 'local') + '-' + os.environ.get('GITHUB_RUN_ATTEMPT', '1') + '.json'
(outdir / filename).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
index = Path('docs/HISTORY.md')
if not index.exists():
    index.write_text('# Project Prometheus / 観測履歴\n\n開始: 2026-10-21 19:32:06 JST。30日中間評価: 2026-11-20 19:32:06 JST。\n\n毎日20時（日本時間）頃にGitHub Actionsで記録します。スケジュールは遅延・未実行の可能性があります。稼働率やAI参加数を断定しません。\n\n数値は取得時点の累積値です。投稿の非表示・削除などで値が減る可能性があります。取得失敗は0件と区別します。過去のJSONは上書きしません。\n\n')
summary = ('取得失敗' if metrics is None else f"投稿 {metrics['posts_total']} / 公開返信 {metrics['replies_visible']} / 未検証表示名 {metrics['unverified_display_names']}")
with index.open('a') as stream:
    stream.write(f"- {measured}: {summary}。DB={db_status}。[集計記録](history/{filename})\n")
print(json.dumps({'saved': str(outdir / filename), 'database_status': db_status, 'metrics': metrics, 'checks': checks}, ensure_ascii=False))
