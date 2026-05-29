import { ipcMain, dialog } from 'electron'
import { queryAll, queryOne, execute, saveToDisk } from './database'

function buildReportData(reportRow: any): any {
  const reportId = reportRow.id

  return {
    id: reportRow.id,
    region: reportRow.region || '',
    year: reportRow.year,
    month: reportRow.month,
    total_leads: reportRow.total_leads,
    total_orders: reportRow.total_orders,
    online_revenue: reportRow.online_revenue,
    offline_revenue: reportRow.offline_revenue,
    total_ad_spend: reportRow.total_ad_spend,

    channel_leads: queryAll(
      'SELECT channel_name, lead_count FROM channel_leads WHERE report_id = ? ORDER BY lead_count DESC',
      [reportId]
    ),

    douyin_accounts: queryAll(
      'SELECT account_name, videos_updated, organic_leads FROM douyin_accounts WHERE report_id = ? ORDER BY id',
      [reportId]
    ),

    douyin_ad_accounts: queryAll(
      'SELECT account_name, ad_spend, lead_count, lead_cost FROM douyin_ad_accounts WHERE report_id = ? ORDER BY id',
      [reportId]
    ),

    xiaohongshu_accounts: queryAll(
      'SELECT account_name, posts_updated, organic_leads FROM xiaohongshu_accounts WHERE report_id = ? ORDER BY id',
      [reportId]
    ),

    xiaohongshu_ad_accounts: queryAll(
      'SELECT account_name, ad_spend, lead_count, lead_cost FROM xiaohongshu_ad_accounts WHERE report_id = ? ORDER BY id',
      [reportId]
    ),

    other_sources: queryAll(
      'SELECT source_name, ad_spend, lead_count, lead_cost, order_count, conversion_rate FROM other_sources WHERE report_id = ? ORDER BY id',
      [reportId]
    )
  }
}

function deleteChildRecords(reportId: number) {
  execute('DELETE FROM channel_leads WHERE report_id = ?', [reportId])
  execute('DELETE FROM douyin_accounts WHERE report_id = ?', [reportId])
  execute('DELETE FROM douyin_ad_accounts WHERE report_id = ?', [reportId])
  execute('DELETE FROM xiaohongshu_accounts WHERE report_id = ?', [reportId])
  execute('DELETE FROM xiaohongshu_ad_accounts WHERE report_id = ?', [reportId])
  execute('DELETE FROM other_sources WHERE report_id = ?', [reportId])
}

export function registerIpcHandlers() {
  ipcMain.handle('db:getReport', async (_event, region: string, year: number, month: number) => {
    try {
      const report = queryOne(
        'SELECT * FROM reports WHERE region = ? AND year = ? AND month = ?',
        [region, year, month]
      )
      if (!report) return null
      return buildReportData(report)
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('db:saveReport', async (_event, data: any) => {
    try {
      const { id, region, year, month, total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend } = data
      let reportId = id

      if (!reportId) {
        const existing: any = queryOne(
          'SELECT id FROM reports WHERE region = ? AND year = ? AND month = ?',
          [region || '', year, month]
        )
        if (existing) reportId = existing.id
      }

      if (reportId) {
        execute(
          `UPDATE reports SET total_leads=?, total_orders=?, online_revenue=?, offline_revenue=?, total_ad_spend=?, updated_at=datetime('now','localtime') WHERE id=?`,
          [total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend, reportId]
        )
        deleteChildRecords(reportId)
      } else {
        execute(
          `INSERT INTO reports (region,year,month,total_leads,total_orders,online_revenue,offline_revenue,total_ad_spend) VALUES (?,?,?,?,?,?,?,?)`,
          [region || '', year, month, total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend]
        )
        const row: any = queryOne('SELECT last_insert_rowid() as id')
        reportId = row.id
      }

      // Channel leads (sorted by lead_count desc for display order)
      for (const ch of (data.channel_leads || [])) {
        execute('INSERT INTO channel_leads (report_id, channel_name, lead_count) VALUES (?,?,?)',
          [reportId, ch.channel_name, ch.lead_count || 0])
      }

      // Douyin organic accounts
      for (const acc of (data.douyin_accounts || [])) {
        execute('INSERT INTO douyin_accounts (report_id, account_name, videos_updated, organic_leads) VALUES (?,?,?,?)',
          [reportId, acc.account_name, acc.videos_updated || 0, acc.organic_leads || 0])
      }

      // Douyin ad accounts
      for (const ad of (data.douyin_ad_accounts || [])) {
        execute('INSERT INTO douyin_ad_accounts (report_id, account_name, ad_spend, lead_count, lead_cost) VALUES (?,?,?,?,?)',
          [reportId, ad.account_name, ad.ad_spend || 0, ad.lead_count || 0, ad.lead_cost || 0])
      }

      // Xiaohongshu organic accounts
      for (const acc of (data.xiaohongshu_accounts || [])) {
        execute('INSERT INTO xiaohongshu_accounts (report_id, account_name, posts_updated, organic_leads) VALUES (?,?,?,?)',
          [reportId, acc.account_name, acc.posts_updated || 0, acc.organic_leads || 0])
      }

      // Xiaohongshu ad accounts
      for (const ad of (data.xiaohongshu_ad_accounts || [])) {
        execute('INSERT INTO xiaohongshu_ad_accounts (report_id, account_name, ad_spend, lead_count, lead_cost) VALUES (?,?,?,?,?)',
          [reportId, ad.account_name, ad.ad_spend || 0, ad.lead_count || 0, ad.lead_cost || 0])
      }

      // Other sources
      for (const os of (data.other_sources || [])) {
        execute('INSERT INTO other_sources (report_id, source_name, ad_spend, lead_count, lead_cost, order_count, conversion_rate) VALUES (?,?,?,?,?,?,?)',
          [reportId, os.source_name, os.ad_spend || 0, os.lead_count || 0, os.lead_cost || 0, os.order_count || 0, os.conversion_rate || 0])
      }

      saveToDisk()
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('db:deleteReport', async (_event, region: string, year: number, month: number) => {
    try {
      const report: any = queryOne('SELECT id FROM reports WHERE region=? AND year=? AND month=?', [region, year, month])
      if (!report) return { success: false, error: '未找到报告' }
      deleteChildRecords(report.id)
      execute('DELETE FROM reports WHERE id=?', [report.id])
      saveToDisk()
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('db:listReports', async () => {
    try {
      return queryAll('SELECT * FROM reports ORDER BY year DESC, month DESC')
    } catch { return [] }
  })

  ipcMain.handle('db:getAllReportsForChart', async () => {
    try {
      return queryAll('SELECT * FROM reports ORDER BY year ASC, month ASC')
    } catch { return [] }
  })

  ipcMain.handle('pdf:generate', async (_event, region: string, year: number, month: number) => {
    try {
      const report: any = queryOne('SELECT * FROM reports WHERE region=? AND year=? AND month=?', [region, year, month])
      if (!report) return { success: false, error: '未找到报告数据' }
      const reportData = buildReportData(report)

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '保存PDF报告',
        defaultPath: `${year}年${month}月_${region}_线索数据报告.pdf`,
        filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
      })
      if (canceled || !filePath) return { success: false, error: '已取消' }

      const { generatePdf } = await import('./pdf-generator')
      await generatePdf(reportData, filePath)
      return { success: true, filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
