CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  level TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'remoto',
  technology TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  requirements TEXT NOT NULL,
  about TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
