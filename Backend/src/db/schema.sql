CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'investigator',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  entities INT,
  records INT,
  relationships INT,
  alerts INT,
  trends INT,
  updated TEXT
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT,
  aliases TEXT[],
  sources TEXT[],
  priority INT,
  first_observed TEXT,
  last_observed TEXT,
  activity INT,
  community TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  type TEXT,
  source TEXT,
  timestamp TEXT,
  hash TEXT,
  full_hash TEXT,
  confidence INT,
  status TEXT DEFAULT 'PENDING REVIEW',
  finding TEXT
);

CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  entity_id TEXT,
  source_id TEXT,
  type TEXT,
  title TEXT,
  snippet TEXT,
  timestamp TEXT,
  confidence INT,
  topic TEXT
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  source TEXT,
  target TEXT,
  type TEXT,
  timestamp TEXT,
  confidence INT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT,
  severity TEXT,
  priority INT,
  confidence INT,
  status TEXT DEFAULT 'UNREVIEWED',
  entity_ids TEXT[],
  evidence_ids TEXT[],
  timestamp TEXT,
  what TEXT,
  why TEXT
);

CREATE TABLE IF NOT EXISTS trends (
  id TEXT PRIMARY KEY,
  name TEXT,
  growth INT,
  confidence INT,
  entities INT,
  status TEXT,
  color TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT,
  detail TEXT,
  route TEXT,
  alert_id TEXT,
  entity_id TEXT,
  trend_id TEXT,
  unread BOOLEAN DEFAULT true,
  time TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource TEXT,
  resource_id TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);