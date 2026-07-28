-- The Morning Brief — D1 schema.
--
-- Editions are stored as validated JSON blobs rather than shredded into
-- relational tables: the frontend consumes a whole edition, the shape is already
-- guaranteed by the shared Zod schema, and one row read beats a dozen joins on a
-- free-tier row budget. The relational tables that remain are the ones we query
-- across rows.

CREATE TABLE IF NOT EXISTS daily_editions (
  date          TEXT PRIMARY KEY,          -- Riyadh calendar date, YYYY-MM-DD
  generated_at  TEXT NOT NULL,             -- ISO 8601
  status        TEXT NOT NULL,             -- live | updating | stale
  payload       TEXT NOT NULL,             -- full Edition JSON
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_editions_generated_at
  ON daily_editions (generated_at DESC);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at  TEXT NOT NULL,              -- ISO 8601
  payload      TEXT NOT NULL,              -- MarketsBlock JSON
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_captured_at
  ON market_snapshots (captured_at DESC);

-- Per-story rows, so a headline can be looked up across editions and so the
-- archive survives KV expiry.
CREATE TABLE IF NOT EXISTS story_clusters (
  id             TEXT NOT NULL,
  edition_date   TEXT NOT NULL REFERENCES daily_editions(date) ON DELETE CASCADE,
  headline       TEXT NOT NULL,
  category       TEXT NOT NULL,
  region         TEXT NOT NULL,
  score          REAL NOT NULL,
  article_count  INTEGER NOT NULL,
  ai_generated   INTEGER NOT NULL,         -- 0 = extractive fallback
  published_at   TEXT NOT NULL,
  payload        TEXT NOT NULL,            -- StoryCluster JSON
  PRIMARY KEY (edition_date, id)
);

CREATE INDEX IF NOT EXISTS idx_story_clusters_category
  ON story_clusters (edition_date, category, score DESC);

-- Article-level record, used to keep a URL from being re-clustered on a later
-- run and to audit which outlet a story came from.
CREATE TABLE IF NOT EXISTS articles (
  url           TEXT PRIMARY KEY,          -- canonical URL
  title         TEXT NOT NULL,
  source        TEXT NOT NULL,
  category      TEXT NOT NULL,
  region        TEXT NOT NULL,
  published_at  TEXT NOT NULL,
  cluster_id    TEXT,
  edition_date  TEXT,
  seen_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_edition ON articles (edition_date, cluster_id);

-- Feed health, so a source that quietly dies is visible rather than just absent.
-- CNN's RSS endpoints returned valid XML for three years after they stopped
-- publishing; this table is how that gets noticed next time.
CREATE TABLE IF NOT EXISTS sources (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  url               TEXT NOT NULL,
  tier              TEXT NOT NULL,         -- direct | proxy
  category          TEXT NOT NULL,
  credibility       REAL NOT NULL,
  last_success_at   TEXT,
  last_error        TEXT,
  last_item_at      TEXT,                  -- newest item seen; detects zombie feeds
  consecutive_fails INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id          TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
