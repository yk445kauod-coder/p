-- TraceBook D1 schema (Cloudflare D1 / SQLite)
-- All ids are UUID strings; timestamps are unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  prefs_json    TEXT NOT NULL DEFAULT '{}',
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  author       TEXT,
  total_pages  INTEGER NOT NULL DEFAULT 0,
  current_page INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'reading', -- reading | finished | paused | wishlist
  cover_color  TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  book_id    TEXT,
  started_at INTEGER NOT NULL,
  ended_at   INTEGER,
  minutes    INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  kind       TEXT NOT NULL, -- minutes | pages | books
  target     INTEGER NOT NULL,
  period     TEXT NOT NULL DEFAULT 'daily', -- daily | weekly | yearly
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  book_id    TEXT,
  text       TEXT NOT NULL,
  page       INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  chat_id    TEXT NOT NULL,
  role       TEXT NOT NULL, -- system | user | assistant
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);

CREATE INDEX IF NOT EXISTS idx_books_user       ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_book    ON sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_goals_user       ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user      ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user       ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat    ON messages(chat_id, created_at);
