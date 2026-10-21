-- Adds 'cancelled' to scheduled_posts.status. SQLite can't alter a CHECK constraint,
-- so the table is rebuilt. D1 enforces foreign keys, so post_metrics is rebuilt too:
-- its new copy points at scheduled_posts_new, the old pair is dropped child-first, and
-- the renames rewrite the reference back to scheduled_posts. Ids are copied unchanged.
-- Run once: npm run db:migrate:0001

CREATE TABLE scheduled_posts_new (
    id TEXT PRIMARY KEY,
    icp_row_id TEXT NOT NULL,
    shell_id TEXT,
    funnel_stage TEXT NOT NULL,
    primary_metric TEXT NOT NULL,
    platform TEXT NOT NULL,
    format TEXT NOT NULL,
    hook_text TEXT NOT NULL,
    post_copy TEXT NOT NULL,
    visual_spec TEXT,
    media_r2_url TEXT,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'publishing', 'published', 'pending_manual', 'failed', 'cancelled')),
    scheduled_at TEXT NOT NULL,
    claimed_at TEXT,
    published_at TEXT,
    platform_post_id TEXT,
    last_error TEXT
);

INSERT INTO scheduled_posts_new SELECT
    id, icp_row_id, shell_id, funnel_stage, primary_metric, platform, format, hook_text, post_copy,
    visual_spec, media_r2_url, status, scheduled_at, claimed_at, published_at, platform_post_id, last_error
FROM scheduled_posts;

CREATE TABLE post_metrics_new (
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
    FOREIGN KEY (post_id) REFERENCES scheduled_posts_new(id)
);

INSERT INTO post_metrics_new SELECT
    id, post_id, impressions, unique_reach, engagement_rate, saves, shares, clicks, comments, recorded_at
FROM post_metrics;

DROP TABLE post_metrics;
DROP TABLE scheduled_posts;

ALTER TABLE scheduled_posts_new RENAME TO scheduled_posts;
ALTER TABLE post_metrics_new RENAME TO post_metrics;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics (post_id, recorded_at);
