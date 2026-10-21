-- Non-identifying, self-declared request signature (not authentication).
-- Keep existing event rows intact; historical signatures remain NULL.
ALTER TABLE events ADD COLUMN agent_signature TEXT;
CREATE INDEX IF NOT EXISTS events_agent_signature_idx ON events(agent_signature, occurred_at);
