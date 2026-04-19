import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:chronicle-ai.db");
  return _db;
}

// Full Phase 1 schema — idempotent (all CREATE TABLE IF NOT EXISTS)
const MIGRATION_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    content     TEXT NOT NULL DEFAULT '',
    mood        TEXT CHECK(mood IN ('great','good','okay','bad','awful')) NULL,
    word_count  INTEGER NOT NULL DEFAULT 0,
    char_count  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    metadata    TEXT NOT NULL DEFAULT '{}',
    local_date  TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood) WHERE mood IS NOT NULL;

CREATE TABLE IF NOT EXISTS tags (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color      TEXT NOT NULL DEFAULT '#6B7280',
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    content,
    content     = 'entries',
    content_rowid = 'rowid',
    tokenize    = 'unicode61 remove_diacritics 1'
);

CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE OF content ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content)
    VALUES ('delete', old.rowid, old.content);
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TABLE IF NOT EXISTS embeddings (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    model       TEXT NOT NULL,
    dimensions  INTEGER NOT NULL,
    vector      BLOB NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    UNIQUE(entry_id, model, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_embeddings_entry_id ON embeddings(entry_id);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
INSERT OR IGNORE INTO settings(key, value) VALUES
    ('theme',             '"system"'),
    ('font_size',         '"medium"'),
    ('autosave_interval', '5000');

CREATE TABLE IF NOT EXISTS media_attachments (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    photo_path    TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    file_size     INTEGER,
    mime_type     TEXT NOT NULL DEFAULT 'image/jpeg',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_media_attachments_entry ON media_attachments(entry_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_order ON media_attachments(entry_id, display_order);

CREATE TABLE IF NOT EXISTS app_lock (
    id          TEXT PRIMARY KEY DEFAULT '1',
    pin_hash    TEXT NOT NULL,
    pin_salt    TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
`;

/**
 * Splits a SQL migration string into individual statements.
 * Handles multi-line statements (triggers, virtual tables) by tracking
 * BEGIN...END blocks and semicolons properly.
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let depth = 0; // tracks BEGIN...END nesting for triggers

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments at statement boundaries
    if (trimmed === "" && current.trim() === "") continue;

    current += line + "\n";

    const upper = trimmed.toUpperCase();
    if (upper === "BEGIN" || upper.endsWith(" BEGIN")) depth++;
    if (upper === "END;" || upper === "END") depth = Math.max(0, depth - 1);

    // Statement complete when we hit a semicolon outside a BEGIN...END block
    if (trimmed.endsWith(";") && depth === 0) {
      const stmt = current.trim();
      if (stmt.length > 1) {
        // Skip bare semicolons
        statements.push(stmt);
      }
      current = "";
    }
  }

  // Flush any remaining content
  const remaining = current.trim();
  if (remaining && remaining !== ";") {
    statements.push(remaining);
  }

  return statements;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();

  const statements = splitSqlStatements(MIGRATION_SQL);

  for (const stmt of statements) {
    if (stmt.trim() === "") continue;
    await db.execute(stmt);
  }

  // FOUND-03 D-08/D-09 — guarded ALTER for upgrade installs.
  // CREATE TABLE IF NOT EXISTS above handles fresh installs (local_date in DDL).
  // Existing v1.0 DBs need ALTER + backfill, which is not idempotent — guard it.
  const cols = await db.select<{ name: string }[]>("PRAGMA table_info(entries)");
  const hasLocalDate = cols.some((c) => c.name === "local_date");
  if (!hasLocalDate) {
    await db.execute("ALTER TABLE entries ADD COLUMN local_date TEXT");
    // D-09 — synchronous backfill from created_at (UTC day, best-effort per D-10).
    // Pre-migration entries near UTC midnight may be off by ±1 calendar day.
    await db.execute(
      "UPDATE entries SET local_date = strftime('%Y-%m-%d', created_at/1000, 'unixepoch') WHERE local_date IS NULL"
    );
    if (import.meta.env.DEV) {
      console.log("[db] Migrated entries.local_date column + backfilled existing rows");
    }
  }

  // ONBRD-05 — auto-seed onboarding completion for existing v1.0 users.
  // Idempotent: INSERT OR IGNORE collapses to no-op when the row already exists;
  // the WHERE (SELECT COUNT(*) FROM entries) > 0 filter ensures fresh installs
  // (no entries) skip the seed and see the welcome overlay on first launch.
  // Compound idempotence: both the OR IGNORE and the WHERE clause must agree
  // before a row is written.
  const onboardingSeedNow = Date.now();
  await db.execute(
    `INSERT OR IGNORE INTO settings(key, value, updated_at)
     SELECT 'onboarding_completed_at', CAST(? AS TEXT), ?
     WHERE (SELECT COUNT(*) FROM entries) > 0`,
    [onboardingSeedNow, onboardingSeedNow]
  );
  if (import.meta.env.DEV) {
    console.log("[db] Seeded onboarding_completed_at for existing-user install (no-op on fresh DBs)");
  }

  // UAT-01 fix — create the local_date index AFTER the column is guaranteed to exist.
  // Must not run inside MIGRATION_SQL because pre-Phase-07 DBs hit the for-loop
  // before the ALTER above has had a chance to add the column. Idempotent via
  // CREATE INDEX IF NOT EXISTS — safe to run on every launch.
  await db.execute("CREATE INDEX IF NOT EXISTS idx_entries_local_date ON entries(local_date)");

  // Verify tables were created (development diagnostic — safe in production)
  if (import.meta.env.DEV) {
    const tables = await db.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    console.log(
      "[db] Tables:",
      tables.map((t) => t.name).join(", ")
    );
  }
}

// PIN/Security operations
export interface AppLockRecord {
  id: string;
  pin_hash: string;
  pin_salt: string;
  created_at: number;
  updated_at: number;
}

export async function getAppLock(): Promise<AppLockRecord | null> {
  const db = await getDb();
  const result = await db.select<AppLockRecord[]>(
    "SELECT * FROM app_lock WHERE id = '1'"
  );
  return result.length > 0 ? result[0] : null;
}

export async function setAppLock(pin_hash: string, pin_salt: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `INSERT OR REPLACE INTO app_lock (id, pin_hash, pin_salt, created_at, updated_at)
     VALUES ('1', ?, ?, ?, ?)`,
    [pin_hash, pin_salt, now, now]
  );
}

export async function clearAppLock(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM app_lock WHERE id = '1'");
}
