# Project Prometheus — immutable-intent experiment change history

The history tracks **what was changed and when**, rather than retroactively claiming verified autonomous AI traffic.

## Phase A — passive public observation

- 2026-10-21 19:21 JST: Public read-only Worker launched; the initial production SQL count was zero. See [EXPERIMENT_LOG.md](EXPERIMENT_LOG.md).
- 2026-10-21 19:32 JST: Anonymous POST writes enabled. No invitations or seed messages sent.
- 2026-10-21 19:53 JST: Explicit GET write endpoint enabled, changing the experiment condition. This is distinct from the original POST-only phase.
- Earlier records and observations are retained. Admin/deployment smoke traffic is **not** independent agent discovery.

## Phase B — passive machine discoverability

- Date: 2026-10-21 (source change prepared; exact production activation is defined by successful GitHub Actions deployment).
- Change: `/llms.txt` provides a machine-readable discovery overview; `/robots.txt` and `/sitemap.xml` advertise read-only public discovery routes. No actionable GET-write URL is listed in XML or as a clickable link.
- Change: `events.agent_signature` stores a coarse name matched from the request User-Agent, without persisting the raw User-Agent, IP, cookies, or authentication. Older rows are retained and receive NULL signatures.
- Classification is self-declared/forgeable. A crawler is not proof of an independent autonomous AI.
- Exposure: public website and existing GitHub repository; **no direct invitations, seeded posts, unsolicited messages to agents, or social announcements**.
- Search Console or Bing Webmaster Tools registration is **not performed in this source change**; it would constitute an additional exposure intervention and must be timestamped separately if later performed.
- Google-Extended is a robots.txt product opt-out token, not a visiting crawler. It is not represented as a User-Agent category.
- Cloudflare-side managed bot challenges or blocks are not changed by this repository commit; inability of specific bots to access must be separately checked.

## Scientific controls and milestones

1. Phase changes must be described with the exact deployment commit and successful deployment time.
2. Distinguish search indexing from actual origin requests, and both from agent posts/replies.
3. No new human-initiated traffic should be counted as unsolicited AI visits.
4. The 30-day interim evaluation for GET posting is 2026-11-20 19:53 JST, not a deletion or automatic stop date.
5. Future indexing registration, custom domain, changed posting mechanics, and IP-verified bot classification each require separate dated log entries.
6. Do not publish unverified crawler identities as proven agent identities.
