---
name: social-ideate
description: Execute Phases 1-4 of the Master Social Media OS. Maps ICP friction rows to Business Goals and Cross-Industry Shells, then runs the mandatory 10-Second Adversarial Pre-Production Gate. Invoke with /social-ideate.
---

# Skill: Master OS Ideation & 10-Second Adversarial Gate (`/social-ideate`)

## Procedure

1. **Load Context State:**
   - Read `context/icp-matrix.md`, `context/transposition-vault.md`, and `context/sprint-hypotheses.md`.
   - If the user passed a specific topic, tension row, or platform as an argument, lock onto it. Otherwise, select the highest-leverage `icp_row_id` that aligns with the current sprint hypotheses.

2. **Generate 3 Distinct Concepts (Phase 3A + 3C + Phase 4.1):**
   For each concept, explicitly output:
   - **Source Mapping:** `icp_row_id` + Verbatim Complaint + `Shell ID` ("Borrow the Shell, Change the Soul" 3-step translation).
   - **Goal & Format Mapping:** Funnel Stage (`TOFU_AWARENESS`, `MOFU_ENGAGEMENT`, `MOFU_TRAFFIC`, `BOFU_CONVERSION`), Primary Metric, and Target Format (`Carousel`, `Short-Form Video`, `Static Graphic`, or `Text-First`).
   - **Slide 1 / First 3 Seconds Hook:** Exact verbal/written hook + visual packaging mechanic.

3. **Run the Adversarial 10-Second Pre-Production Gate (Phase 4.2):**
   Act as a ruthless creative director and grade every concept against:
   - **Gate 1 — The Specificity Gate:** Name the exact person and moment they stop scrolling. (Fail if vague).
   - **Gate 2 — The 10-Second Payoff Gate:** State the exact tangible tool, emotional relief, or contrarian shift delivered by Slide 2 or Second 10. (Fail if slow preamble).
   - **Gate 3 — The 4 Transposition Guardrails (Score each 1-10):**
     1. *Aesthetic Integrity*
     2. *Value Alignment*
     3. *Price-to-Effort Calibration*
     4. *Originality Defense*
   - **Auto-Rewrite Rule:** If any concept fails Gate 1 or Gate 2, or scores below 8/10 on any guardrail, rewrite it inline before presenting the final selection to the user.

4. **Handoff:**
   Ask the user which concept number (1, 2, or 3) to greenlight for `/social-build`.
