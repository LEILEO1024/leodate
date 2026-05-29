import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

let db: SqlJsDatabase | null = null
let dbPath: string

function getDataDir(): string {
  const home = app.getPath('home')
  const dir = join(home, 'LeoDate')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function saveToDisk(): void {
  if (!db) return
  writeFileSync(dbPath, Buffer.from(db.export()))
}

export async function initDatabase(): Promise<void> {
  dbPath = join(getDataDir(), 'data.db')
  const SQL = await initSqlJs()

  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      region          TEXT    NOT NULL,
      year            INTEGER NOT NULL,
      month           INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      total_leads     INTEGER NOT NULL DEFAULT 0,
      total_orders    INTEGER NOT NULL DEFAULT 0,
      online_revenue  REAL    NOT NULL DEFAULT 0,
      offline_revenue REAL    NOT NULL DEFAULT 0,
      total_ad_spend  REAL    NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(region, year, month)
    )
  `)

  // Step 1: Organic accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS organic_accounts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      platform_name   TEXT    NOT NULL,
      account_name    TEXT    NOT NULL,
      content_updated INTEGER NOT NULL DEFAULT 0,
      organic_leads   INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Step 2: Ad accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_accounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      platform_name TEXT   NOT NULL,
      account_name TEXT    NOT NULL,
      ad_spend     REAL    NOT NULL DEFAULT 0,
      lead_count   INTEGER NOT NULL DEFAULT 0,
      lead_cost    REAL    NOT NULL DEFAULT 0
    )
  `)

  // Step 3: Other channels
  db.run(`
    CREATE TABLE IF NOT EXISTS other_channels (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      channel_name    TEXT    NOT NULL,
      ad_spend        REAL    NOT NULL DEFAULT 0,
      lead_count      INTEGER NOT NULL DEFAULT 0,
      lead_cost       REAL    NOT NULL DEFAULT 0,
      order_count     INTEGER NOT NULL DEFAULT 0,
      conversion_rate REAL    NOT NULL DEFAULT 0
    )
  `)

  // Channel leads (auto-generated, for report display)
  db.run(`
    CREATE TABLE IF NOT EXISTS channel_leads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      channel_name TEXT    NOT NULL,
      lead_count   INTEGER NOT NULL DEFAULT 0
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_organic_accounts_report ON organic_accounts(report_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_ad_accounts_report ON ad_accounts(report_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_other_channels_report ON other_channels(report_id)')

  // Drop legacy tables
  db.run('DROP TABLE IF EXISTS deal_sources')
  db.run('DROP TABLE IF EXISTS douyin_accounts')
  db.run('DROP TABLE IF EXISTS douyin_ad_accounts')
  db.run('DROP TABLE IF EXISTS xiaohongshu_accounts')
  db.run('DROP TABLE IF EXISTS xiaohongshu_ad_accounts')
  db.run('DROP TABLE IF EXISTS other_sources')

  saveToDisk()
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function queryAll(sql: string, params?: unknown[]): unknown[] {
  const stmt = getDb().prepare(sql)
  if (params) stmt.bind(params as any[])
  const rows: unknown[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function queryOne(sql: string, params?: unknown[]): unknown | undefined {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : undefined
}

export function execute(sql: string, params?: unknown[]): void {
  getDb().run(sql, params)
}

export function closeDatabase(): void {
  if (db) { saveToDisk(); db.close(); db = null }
}
