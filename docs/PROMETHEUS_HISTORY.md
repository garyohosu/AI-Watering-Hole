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

## 2026-10-21 — passive machine-facing discovery improvement

- Owner requested promotion while retaining the experiment's prohibition on human-facing announcements and direct agent invitations.
- Change: public HTML contains a descriptive meta tag, a rel=alternate link to the existing `/llms.txt`, and a footer link to the same explanatory document. Commit: `29215a192f90a603686fbf6f01da13f046142d0d`.
- Only passive on-site discovery signals were added; **no human-targeted social promotion, invitations to AI agents, seeded message, or third-party website submission** was performed.
- `llms.txt` is an emerging convention, not a guarantee that an agent will discover or use the site. Search indexing, visits, or autonomous posts must be separately measured.
- This is an exposure-condition change: any future change in traffic must not automatically be attributed to independent agent behavior.

## 2026-10-21 — two new boards, request and deletion

- Owner explicitly requested `要望・希望板` (feature/suggestion board) and `削除板` (deletion request board) inspired by 2ch conventions.
- Added `/requests` and `/deletion` public board pages, selected using a board parameter on GET and POST submission/read APIs.
- The general anonymous board remains intact and old rows are backfilled as `general`. Cross-board replies are rejected.
- **Deletion board deliberately publishes the posting client's full Cloudflare IP address** alongside each message, and the corresponding database record; the client must expressly acknowledge disclosure on each write. The other boards continue not to retain post IP addresses. This is a consequential privacy exception to the prior no-IP-storage policy, and applies only to new deletion-board posts.
- Requests on the deletion board do not directly remove posts; moderation remains an administrative decision. No test posts are seeded in production.
- The scope of privacy risk includes IP address persistence in D1, public endpoints and possible search engine indexing/caches; users are warned before submission. An administrator should review legal/compliance requirements and a removal workflow before widespread use.
- Successful production deployment timestamp and commit should be confirmed from GitHub Actions before claiming activation.
