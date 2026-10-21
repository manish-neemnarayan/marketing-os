# Master Social Media OS — Standing Instructions

## 1. Stack & Tooling
- **Orchestration:** Claude Code (`claude.ai/code` or CLI) using repo-scoped Agent Skills in `.claude/skills/`.
- **Backend / Publishing Queue:** Cloudflare Workers (TypeScript) + Cloudflare D1 (Serverless SQLite) + Cloudflare R2 (Zero-egress media storage).
- **Cost Constraint:** 100% Free Tier architecture. Never add paid SaaS schedulers (Blotato, Bundle Social, Ayrshare) or paid scraper dependencies.

## 2. Hard Laws (Never Violate)
1. **No Unmapped Content:** Every content idea MUST cite a specific `icp_row_id` from `context/icp-matrix.md` and a single primary business goal from Phase 2 (`TOFU_AWARENESS`, `MOFU_ENGAGEMENT`, `MOFU_TRAFFIC`, `BOFU_CONVERSION`, or `BRAND_HEALTH`).
2. **Mandatory 10-Second Pre-Production Gate:** Never write full post copy or carousel slides until a concept passes:
   - **Specificity Gate:** Names the exact persona + situation who stops scrolling (reject "anyone who wants growth").
   - **Payoff Gate:** States the exact value delivered within the first 10 seconds or first 2 slides.
   - **4 Transposition Guardrails:** Scores >= 8/10 across Aesthetic Integrity, Value Alignment, Price-to-Effort Calibration, and Originality Defense.
3. **Anti-AI Writing Enforcement:** Never use LLM filler words ("delve", "tapestry", "testament", "in today's fast-paced world", "game-changer", "unlock", "elevate", "let's dive in", symmetrical rule-of-three adjectives, or em-dash overuse). Use concrete operational vocabulary from `context/icp-matrix.md`.
4. **Approval Gate Before Queueing:** Never push a post to the Cloudflare Worker `/api/queue` endpoint without explicit user confirmation.

## 3. Slash Commands (Skills)
- `/social-ideate` — Reads `context/icp-matrix.md`, `context/transposition-vault.md`, and `context/sprint-hypotheses.md`, pitches 3 transposed concepts, and roasts them through the 10-Second Adversarial Gate.
- `/social-build` — Takes a greenlit concept and builds platform-ready copy, Phase 5 visual packaging specs (hook anatomy, typography safe-zones, pacing/cuts, or HTML/Tailwind carousel slides), runs the Anti-AI humanizer pass, and outputs the D1 queue payload.
- `/social-audit` — Pulls post performance from Cloudflare D1 (`post_metrics`), deconstructs winners and losers across the 5 Creative Levers (Phase 5), and updates `context/sprint-hypotheses.md`.

## 4. Worker API & Post Lifecycle
All endpoints require `Authorization: Bearer $API_SECRET_KEY`.
- `POST /api/queue` — queue a greenlit post. `scheduled_at` is normalized to ISO-8601 UTC.
- `GET /api/metrics` — last 30 posts with their latest metrics snapshot.
- `POST /api/metrics` — ingest one row or an array: `{ post_id, impressions, unique_reach, engagement_rate, saves, shares, clicks, comments }`. This is the main metrics path; platform analytics APIs are not pulled automatically.
- `PATCH /api/posts/:id` — `{ "status": "published", "platform_post_id": "..." }` after posting a `pending_manual`/`failed` post by hand, or `{ "status": "queued" }` to retry a `failed` post.

Statuses: `queued` → `publishing` → `published` | `pending_manual` | `failed`.
- Only LinkedIn text posts without media are auto-published. Everything else becomes `pending_manual` when due: post it by hand, then PATCH it to `published`.
- Never treat `pending_manual` posts as live in `/social-audit`.

## 5. Commands (run from `worker/`)
- Auth in cloud sessions: `wrangler login` needs a browser; set `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`) as environment secrets instead.
- `npm install` · `npm run typecheck` · `npm run dev` (local, `/__scheduled?cron=...` triggers crons)
- `npx wrangler d1 create social-os-db` → paste `database_id` into `wrangler.toml` → `npm run db:schema`
- `npx wrangler r2 bucket create social-os-media` (needs R2 enabled on the account; requires a payment method even on the free tier)
- `npx wrangler secret put API_SECRET_KEY` (optional: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`; LinkedIn tokens expire after ~60 days)
- `npm run deploy`
