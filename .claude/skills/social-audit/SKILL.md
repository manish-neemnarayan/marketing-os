---
name: social-audit
description: Execute Phase 6 Deep Performance Analytics and Phase 7 Strategic Synthesis. Audits D1 metrics against the 5 Creative Levers and updates sprint hypotheses. Invoke with /social-audit.
disable-model-invocation: true
---

# Skill: Phase 6 & 7 Performance Deconstruction & Loop (`/social-audit`)

## Procedure

1. **Fetch Performance Data:**
   Read recent post performance from the Worker (`GET /api/metrics`, latest snapshot per post) or from Cloudflare D1 (run from `worker/`: `npx wrangler d1 execute social-os-db --remote --command "SELECT * FROM scheduled_posts JOIN post_metrics ON scheduled_posts.id = post_metrics.post_id ORDER BY recorded_at DESC LIMIT 20;"`).
   - Metrics are not pulled from platform APIs automatically. If the user pastes analytics / CSV data, map each row to a `post_id`, show the `POST /api/metrics` payload, and ingest it only after the user approves.
   - Only audit posts with `status = 'published'`. List any `pending_manual` posts and ask whether they went live (then `PATCH /api/posts/:id`).

2. **Phase 6 Multi-Dimensional Audit:**
   - Group posts by `funnel_stage` and evaluate *only* against their assigned `primary_metric` (never judge a BOFU conversion post by TOFU reach).
   - Identify the top 20% outperformers and bottom 20% underperformers.

3. **Phase 5 Creative Lever Deconstruction ("The Why"):**
   Break down why the winners won and losers lost across:
   1. Hook Anatomy (First 3s / Slide 1)
   2. Narrative Pacing & Payoff Speed
   3. Tone Delivery
   4. Visual Packaging & Typography
   5. CTA Proportionality

4. **Phase 7 Strategic Synthesis (Close the Loop):**
   - Update `context/sprint-hypotheses.md` with:
     - **Double Down:** Top 2 format + hook combinations to repeat next sprint.
     - **Eliminate / Pivot:** Formats or angles to retire.
     - **New Sprint Hypotheses:** 1–2 measurable hypotheses for the next cycle.
   - Append any newly surfaced audience objections from comments/DMs as new rows in `context/icp-matrix.md`.
