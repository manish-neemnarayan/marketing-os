CREATE TABLE IF NOT EXISTS icp_matrix (
    id TEXT PRIMARY KEY,
    tension_category TEXT NOT NULL,
    underlying_emotion TEXT NOT NULL,
    verbatim_complaint TEXT NOT NULL,
    content_angle TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    icp_row_id TEXT NOT NULL,
    shell_id TEXT,
    funnel_stage TEXT NOT NULL,   -- TOFU_AWARENESS, MOFU_ENGAGEMENT, MOFU_TRAFFIC, BOFU_CONVERSION, BRAND_HEALTH
    primary_metric TEXT NOT NULL,
    platform TEXT NOT NULL,       -- linkedin, x, instagram
    format TEXT NOT NULL,         -- carousel, short_video, static, text
    hook_text TEXT NOT NULL,
    post_copy TEXT NOT NULL,
    visual_spec TEXT,
    media_r2_url TEXT,
    -- queued      : waiting for scheduled_at
    -- publishing  : claimed by a cron run (prevents double-posting)
    -- published   : confirmed live, platform_post_id is the real platform ID
    -- pending_manual : due, but no API publisher for this platform/format; post it by hand,
    --                  then PATCH /api/posts/:id to mark it published
    -- failed      : publish attempt errored, see last_error
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'publishing', 'published', 'pending_manual', 'failed')),
    scheduled_at TEXT NOT NULL,   -- always ISO-8601 UTC (normalized by the Worker)
    claimed_at TEXT,
    published_at TEXT,
    platform_post_id TEXT,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts (status, scheduled_at);

CREATE TABLE IF NOT EXISTS post_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    unique_reach INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0.0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics (post_id, recorded_at);
