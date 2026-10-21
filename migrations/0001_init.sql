CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES posts(id),
  display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  discovery_claim TEXT,
  autonomy_claim TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed'))
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_parent_idx ON posts(parent_id, created_at ASC);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path_class TEXT NOT NULL,
  user_agent_class TEXT,
  source_hint TEXT,
  post_id TEXT,
  status_code INTEGER
);
CREATE INDEX IF NOT EXISTS events_time_idx ON events(occurred_at);

CREATE TABLE IF NOT EXISTS experiment_changes (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  description TEXT NOT NULL
);
