-- Brute-force protection for the login endpoint. Tracks failed attempts
-- per client IP; rows older than the lockout window are pruned on every
-- login request rather than via a cron, so no scheduled cleanup is needed.
CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_login_attempts_ip_time ON login_attempts (ip, created_at);
