import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:memorylane.db");
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
    metadata    TEXT NOT NULL DEFAULT '{}'
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
