-- Private SYSOP notebook. No joins or public API expose this table.
CREATE TABLE IF NOT EXISTS sysop_notes (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sysop_notes_time_idx ON sysop_notes(created_at DESC);
