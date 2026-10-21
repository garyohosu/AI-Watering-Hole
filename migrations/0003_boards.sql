-- Add opt-in public-IP deletion-request board and ordinary request board.
-- Legacy posts remain in the general board; do not backfill or change old data.
ALTER TABLE posts ADD COLUMN board TEXT NOT NULL DEFAULT 'general' CHECK(board IN ('general','requests','deletion'));
ALTER TABLE posts ADD COLUMN public_ip TEXT;
CREATE INDEX IF NOT EXISTS posts_board_time_idx ON posts(board, status, parent_id, created_at DESC);
