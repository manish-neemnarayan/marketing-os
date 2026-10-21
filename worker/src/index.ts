export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  API_SECRET_KEY: string;
  LINKEDIN_API_VERSION: string;
  LINKEDIN_ACCESS_TOKEN?: string;
  LINKEDIN_AUTHOR_URN?: string;
}

const FUNNEL_STAGES = ["TOFU_AWARENESS", "MOFU_ENGAGEMENT", "MOFU_TRAFFIC", "BOFU_CONVERSION", "BRAND_HEALTH"];
const PLATFORMS = ["linkedin", "x", "instagram"];
const FORMATS = ["carousel", "short_video", "static", "text"];
const METRIC_FIELDS = ["impressions", "unique_reach", "engagement_rate", "saves", "shares", "clicks", "comments"] as const;

const PUBLISH_CRON = "*/15 * * * *";
const PUBLISH_BATCH_SIZE = 20; // stays well under the free plan's 50 subrequests per invocation
const STUCK_AFTER_MS = 60 * 60 * 1000;

type Post = Record<string, any>;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Fail closed: an unset secret must never turn "Bearer undefined" into a valid key.
    if (!env.API_SECRET_KEY) {
      return Response.json({ error: "API_SECRET_KEY is not configured" }, { status: 500 });
    }
    if (!(await isAuthorized(request.headers.get("Authorization"), env.API_SECRET_KEY))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);

    try {
      // 1. Queue a greenlit post from Claude Code
      if (request.method === "POST" && url.pathname === "/api/queue") {
        return await queuePost(request, env);
      }

      // 2. Fetch metrics for Phase 6 & 7 /social-audit skill
      if (request.method === "GET" && url.pathname === "/api/metrics") {
        return await listMetrics(env);
      }

      // 3. Ingest metric snapshots (from exported platform CSVs)
      if (request.method === "POST" && url.pathname === "/api/metrics") {
        return await ingestMetrics(request, env);
      }

      // 4. Mark a manually posted / failed post's status
      const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
      if (request.method === "PATCH" && postMatch) {
        return await updatePostStatus(request, env, decodeURIComponent(postMatch[1]));
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
      }
      throw err;
    }

    return Response.json({ status: "Master Social OS Worker Online" });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === PUBLISH_CRON) {
      ctx.waitUntil(publishDuePosts(env));
    } else {
      ctx.waitUntil(recoverStuckPosts(env));
    }
  },
};

async function isAuthorized(header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  // Hash both sides so timingSafeEqual always compares equal-length buffers.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(header)),
    crypto.subtle.digest("SHA-256", enc.encode(`Bearer ${secret}`)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

async function queuePost(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Post;

  for (const field of ["icp_row_id", "funnel_stage", "primary_metric", "platform", "format", "hook_text", "post_copy", "scheduled_at"]) {
    if (typeof body[field] !== "string" || body[field].trim() === "") {
      return badRequest(`Missing or empty field: ${field}`);
    }
  }
  if (!FUNNEL_STAGES.includes(body.funnel_stage)) return badRequest(`funnel_stage must be one of ${FUNNEL_STAGES.join(", ")}`);
  if (!PLATFORMS.includes(body.platform)) return badRequest(`platform must be one of ${PLATFORMS.join(", ")}`);
  if (!FORMATS.includes(body.format)) return badRequest(`format must be one of ${FORMATS.join(", ")}`);

  // Normalize to ISO-8601 UTC so the text comparison in publishDuePosts is correct.
  const scheduled = new Date(body.scheduled_at);
  if (Number.isNaN(scheduled.getTime())) {
    return badRequest("scheduled_at must be a parseable date, e.g. 2026-10-22T09:00:00Z");
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO scheduled_posts
    (id, icp_row_id, shell_id, funnel_stage, primary_metric, platform, format, hook_text, post_copy, visual_spec, media_r2_url, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.icp_row_id,
      body.shell_id || null,
      body.funnel_stage,
      body.primary_metric,
      body.platform,
      body.format,
      body.hook_text,
      body.post_copy,
      body.visual_spec || null,
      body.media_r2_url || null,
      scheduled.toISOString()
    )
    .run();

  return Response.json({ success: true, postId: id, scheduled_at: scheduled.toISOString() }, { status: 201 });
}

async function listMetrics(env: Env): Promise<Response> {
  // One row per post, using its most recent metrics snapshot.
  const { results } = await env.DB.prepare(
    `SELECT p.*, m.impressions, m.unique_reach, m.engagement_rate, m.saves, m.shares, m.clicks, m.comments, m.recorded_at
     FROM scheduled_posts p
     LEFT JOIN post_metrics m ON m.id = (
       SELECT id FROM post_metrics WHERE post_id = p.id ORDER BY recorded_at DESC, id DESC LIMIT 1
     )
     ORDER BY p.scheduled_at DESC LIMIT 30`
  ).all();
  return Response.json({ results });
}

async function ingestMetrics(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Post | Post[];
  const rows = Array.isArray(body) ? body : [body];
  if (rows.length === 0) return badRequest("No metric rows provided");

  for (const row of rows) {
    if (typeof row.post_id !== "string" || row.post_id === "") return badRequest("Every row needs a post_id");
    for (const field of METRIC_FIELDS) {
      if (row[field] !== undefined && typeof row[field] !== "number") return badRequest(`${field} must be a number`);
    }
  }

  const ids = [...new Set(rows.map((r) => r.post_id as string))];
  const { results: known } = await env.DB.prepare(
    `SELECT id FROM scheduled_posts WHERE id IN (${ids.map(() => "?").join(", ")})`
  )
    .bind(...ids)
    .all<{ id: string }>();
  const unknown = ids.filter((id) => !known.some((k) => k.id === id));
  if (unknown.length > 0) return badRequest(`Unknown post_id(s): ${unknown.join(", ")}`);

  await env.DB.batch(
    rows.map((row) =>
      env.DB.prepare(
        `INSERT INTO post_metrics (post_id, impressions, unique_reach, engagement_rate, saves, shares, clicks, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(row.post_id, ...METRIC_FIELDS.map((f) => row[f] ?? 0))
    )
  );

  return Response.json({ success: true, inserted: rows.length }, { status: 201 });
}

async function updatePostStatus(request: Request, env: Env, id: string): Promise<Response> {
  const body = (await request.json()) as Post;

  if (body.status === "published") {
    // Only posts that were never auto-published can be marked live by hand.
    const res = await env.DB.prepare(
      `UPDATE scheduled_posts SET status = 'published', published_at = ?, platform_post_id = ?, last_error = NULL
       WHERE id = ? AND status IN ('pending_manual', 'failed')`
    )
      .bind(body.published_at ? new Date(body.published_at).toISOString() : new Date().toISOString(), body.platform_post_id || null, id)
      .run();
    if (res.meta.changes === 0) return badRequest("Post not found or not in pending_manual/failed status");
    return Response.json({ success: true });
  }

  if (body.status === "queued") {
    // Retry a failed post on the next publish run.
    const res = await env.DB.prepare(
      `UPDATE scheduled_posts SET status = 'queued', claimed_at = NULL, last_error = NULL WHERE id = ? AND status = 'failed'`
    )
      .bind(id)
      .run();
    if (res.meta.changes === 0) return badRequest("Post not found or not in failed status");
    return Response.json({ success: true });
  }

  return badRequest("status must be 'published' or 'queued'");
}

async function publishDuePosts(env: Env) {
  const now = new Date().toISOString();

  // Claim due rows in a single statement so overlapping runs can never publish the same post twice.
  const { results } = await env.DB.prepare(
    `UPDATE scheduled_posts SET status = 'publishing', claimed_at = ?
     WHERE id IN (
       SELECT id FROM scheduled_posts WHERE status = 'queued' AND scheduled_at <= ?
       ORDER BY scheduled_at LIMIT ${PUBLISH_BATCH_SIZE}
     )
     RETURNING *`
  )
    .bind(now, now)
    .all<Post>();

  for (const post of results) {
    try {
      const manualReason = manualPublishReason(post, env);
      if (manualReason) {
        await env.DB.prepare(`UPDATE scheduled_posts SET status = 'pending_manual', last_error = ? WHERE id = ?`)
          .bind(manualReason, post.id)
          .run();
        continue;
      }

      const platformPostId = await publishToLinkedIn(post, env);
      await env.DB.prepare(
        `UPDATE scheduled_posts SET status = 'published', published_at = ?, platform_post_id = ?, last_error = NULL WHERE id = ?`
      )
        .bind(new Date().toISOString(), platformPostId, post.id)
        .run();
    } catch (err) {
      await env.DB.prepare(`UPDATE scheduled_posts SET status = 'failed', last_error = ? WHERE id = ?`)
        .bind(String(err instanceof Error ? err.message : err).slice(0, 1000), post.id)
        .run();
    }
  }
}

// Returns why a post can't be auto-published, or null if the LinkedIn publisher can handle it.
function manualPublishReason(post: Post, env: Env): string | null {
  if (post.platform !== "linkedin") return `No API publisher for platform '${post.platform}'; post manually`;
  if (post.format !== "text" || post.media_r2_url) {
    return `LinkedIn media upload is not implemented for format '${post.format}'; post manually`;
  }
  if (!env.LINKEDIN_ACCESS_TOKEN || !env.LINKEDIN_AUTHOR_URN) {
    return "LINKEDIN_ACCESS_TOKEN / LINKEDIN_AUTHOR_URN secrets are not set; post manually";
  }
  return null;
}

async function publishToLinkedIn(post: Post, env: Env): Promise<string> {
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": env.LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: env.LINKEDIN_AUTHOR_URN,
      commentary: escapeLittleText(post.post_copy),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${await res.text()}`);

  // The Posts API returns 201 with an empty body; the post URN is in this header.
  const postUrn = res.headers.get("x-restli-id");
  if (!postUrn) throw new Error("LinkedIn returned success without an x-restli-id header");
  return postUrn;
}

// LinkedIn's "little text" format treats these characters as markup; unescaped they get
// dropped or break the post. '#' is left alone so hashtags still link.
function escapeLittleText(text: string): string {
  return text.replace(/[\\|{}@\[\]()<>*_~]/g, (c) => `\\${c}`);
}

async function recoverStuckPosts(env: Env) {
  // A run that died mid-publish leaves rows in 'publishing'. The post may or may not be live,
  // so mark it failed for a human to check instead of silently retrying.
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  await env.DB.prepare(
    `UPDATE scheduled_posts
     SET status = 'failed', last_error = 'Stuck in publishing; check the platform before re-queueing'
     WHERE status = 'publishing' AND claimed_at < ?`
  )
    .bind(cutoff)
    .run();
}
