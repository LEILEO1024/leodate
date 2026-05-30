import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

function getDataDir(): string {
  const home = app.getPath('home')
  const dir = join(home, 'LeoDate')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function initDatabase(): void {
  const dbPath = join(getDataDir(), 'data.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS organic_accounts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      platform_name   TEXT    NOT NULL,
      account_name    TEXT    NOT NULL,
      content_updated INTEGER NOT NULL DEFAULT 0,
      organic_leads   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ad_accounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      platform_name TEXT   NOT NULL,
      account_name TEXT    NOT NULL,
      ad_spend     REAL    NOT NULL DEFAULT 0,
      lead_count   INTEGER NOT NULL DEFAULT 0,
      lead_cost    REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      order_time      TEXT,
      order_content   TEXT,
      order_status    TEXT,
      order_creator   TEXT,
      deal_count      TEXT,
      product_name    TEXT,
      customer_info   TEXT,
      contact_info    TEXT,
      customer_source TEXT,
      order_amount    REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS other_channels (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      channel_name    TEXT    NOT NULL,
      ad_spend        REAL    NOT NULL DEFAULT 0,
      lead_count      INTEGER NOT NULL DEFAULT 0,
      lead_cost       REAL    NOT NULL DEFAULT 0,
      order_count     INTEGER NOT NULL DEFAULT 0,
      conversion_rate REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS channel_leads (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      channel_name TEXT    NOT NULL,
      lead_count   INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_organic_accounts_report ON organic_accounts(report_id);
    CREATE INDEX IF NOT EXISTS idx_ad_accounts_report ON ad_accounts(report_id);
    CREATE INDEX IF NOT EXISTS idx_other_channels_report ON other_channels(report_id);
    CREATE INDEX IF NOT EXISTS idx_order_entries_report ON order_entries(report_id);

    DROP TABLE IF EXISTS deal_sources;
    DROP TABLE IF EXISTS douyin_accounts;
    DROP TABLE IF EXISTS douyin_ad_accounts;
    DROP TABLE IF EXISTS xiaohongshu_accounts;
    DROP TABLE IF EXISTS xiaohongshu_ad_accounts;
    DROP TABLE IF EXISTS other_sources;
  `)
}

export function queryAll(sql: string, params?: unknown[]): unknown[] {
  if (!db) throw new Error('Database not initialized')
  return db.prepare(sql).all(...(params || [])) as unknown[]
}

export function queryOne(sql: string, params?: unknown[]): unknown | undefined {
  if (!db) throw new Error('Database not initialized')
  return db.prepare(sql).get(...(params || []))
}

export function execute(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized')
  const result = db.prepare(sql).run(...(params || []))
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid as number }
}

export function closeDatabase(): void {
  if (db) { db.close(); db = null }
}
