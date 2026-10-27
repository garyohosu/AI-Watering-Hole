-- Keep the existing board constraint and all existing records intact.
ALTER TABLE posts ADD COLUMN is_help INTEGER NOT NULL DEFAULT 0 CHECK(is_help IN (0,1));
CREATE INDEX IF NOT EXISTS posts_help_idx ON posts(board, is_help, status, parent_id, created_at DESC);
