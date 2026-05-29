import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

let db: SqlJsDatabase | null = null
let dbPath: string

function getDataDir(): string {
  const home = app.getPath('home')
  const dir = join(home, 'LeoDate')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function saveToDisk(): void {
  if (!db) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

export async function initDatabase(): Promise<void> {
  dbPath = join(getDataDir(), 'data.db')
  const SQL = await initSqlJs()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
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

  db.run(`
    CREATE TABLE IF NOT EXISTS channel_leads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      channel_name TEXT    NOT NULL,
      lead_count   INTEGER NOT NULL DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS deal_sources (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      source_name     TEXT    NOT NULL,
      order_count     INTEGER NOT NULL DEFAULT 0,
      revenue         REAL    NOT NULL DEFAULT 0,
      conversion_rate REAL    NOT NULL DEFAULT 0
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_channel_leads_report ON channel_leads(report_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_deal_sources_report ON deal_sources(report_id)')

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
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
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
  if (db) {
    saveToDisk()
    db.close()
    db = null
  }
}
