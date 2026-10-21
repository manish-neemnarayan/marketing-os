---
name: social-build
description: Execute Phase 4 & Phase 5 Creative Production, Anti-AI Copy Polish, Visual Packaging Blueprints, and Cloudflare D1/R2 queue payload generation. Invoke with /social-build.
disable-model-invocation: true
---

# Skill: Creative Production, Anti-AI Polish & Cloudflare Queue (`/social-build`)

## Procedure

1. **Verify Greenlight Gate:**
   Confirm the concept has an assigned `icp_row_id`, `funnel_stage`, `primary_metric`, and passed the 10-Second Gate.

2. **Build the Asset & Phase 5 Creative Levers:**
   - **Lever 1 (First 3 Seconds / Slide 1-2 Hook Anatomy):** Write both the Exact Written/Verbal Hook and the Visual Spec (contrast, motion, or layout).
   - **Lever 2 & 3 (Core Narrative & Tone Calibration):** Write the complete asset (slide-by-slide copy for Carousels, time-coded split-screen script for Short-Form Video, or structured text for LinkedIn/X) matching the exact ICP tone in `context/icp-matrix.md`.
   - **Lever 4 (Visual Packaging & Typography Spec):** Define font hierarchy, safe-zone placement, color contrast, and cut intervals. If the format is a Carousel or Single Static Graphic, also offer to generate a self-contained HTML/Tailwind/SVG artifact in `drafts/` that can be screenshotted to PNG.
   - **Lever 5 (CTA Proportionality):** Match the CTA strictly to the assigned `primary_metric` (e.g., bookmark trigger for `MOFU_ENGAGEMENT`, UTM link trigger for `MOFU_TRAFFIC`/`BOFU_CONVERSION`).

3. **Run the Deterministic Anti-AI Writing Pass:**
   Audit every sentence and remove:
   - Banned vocabulary: *delve, tapestry, testament, beacon, realm, landscape, game-changer, unlock, unleash, elevate, crucial, vital, powerhouse, seamless, robust, in today's fast-paced world, let's dive in*.
   - Banned syntax: "It's not just X, it's Y" contrast clichés, robotic rule-of-three adjective chains, rhetorical throat-clearing questions, and exaggerated hype.

4. **Save Draft & Prepare Cloudflare Queue Payload:**
   - Save the complete creative spec and copy to `drafts/YYYY-MM-DD-<slug>.md`.
   - Generate the exact JSON payload ready for `POST /api/queue` on the Cloudflare Worker and ask the user for approval before executing `curl` or `wrangler d1 execute`.
   - Payload fields: `icp_row_id`, `shell_id`, `funnel_stage`, `primary_metric`, `platform` (`linkedin` | `x` | `instagram`), `format` (`carousel` | `short_video` | `static` | `text`), `hook_text`, `post_copy`, `visual_spec`, `media_r2_url`, `scheduled_at` (ISO-8601 with timezone, e.g. `2026-10-22T09:00:00Z`).
   - Tell the user up front if the post will land as `pending_manual` (anything other than a LinkedIn text post without media), so they know to post it by hand.
