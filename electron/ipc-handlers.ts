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
    organic_accounts: queryAll('SELECT platform_name, account_name, content_updated, organic_leads FROM organic_accounts WHERE report_id=? ORDER BY platform_name, id', [reportId]),
    ad_accounts: queryAll('SELECT platform_name, account_name, ad_spend, lead_count, lead_cost FROM ad_accounts WHERE report_id=? ORDER BY platform_name, id', [reportId]),
    other_channels: queryAll('SELECT channel_name, ad_spend, lead_count, lead_cost, order_count, conversion_rate FROM other_channels WHERE report_id=? ORDER BY id', [reportId]),
    order_entries: queryAll('SELECT order_time, order_content, order_status, order_creator, deal_count, product_name, customer_info, contact_info, customer_source, order_amount FROM order_entries WHERE report_id=? ORDER BY id', [reportId]),
    channel_leads: queryAll('SELECT channel_name, lead_count FROM channel_leads WHERE report_id=? ORDER BY lead_count DESC', [reportId])
  }
}

function deleteChildRecords(reportId: number) {
  execute('DELETE FROM organic_accounts WHERE report_id=?', [reportId])
  execute('DELETE FROM ad_accounts WHERE report_id=?', [reportId])
  execute('DELETE FROM other_channels WHERE report_id=?', [reportId])
  execute('DELETE FROM order_entries WHERE report_id=?', [reportId])
  execute('DELETE FROM channel_leads WHERE report_id=?', [reportId])
}

export function registerIpcHandlers() {
  ipcMain.handle('db:getReport', async (_e, region: string, year: number, month: number) => {
    try {
      const r = queryOne('SELECT * FROM reports WHERE region=? AND year=? AND month=?', [region, year, month])
      return r ? buildReportData(r) : null
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:saveReport', async (_e, data: any) => {
    try {
      const { id, region, year, month, total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend } = data
      let reportId = id
      if (!reportId) {
        const ex: any = queryOne('SELECT id FROM reports WHERE region=? AND year=? AND month=?', [region || '', year, month])
        if (ex) reportId = ex.id
      }
      if (reportId) {
        execute('UPDATE reports SET total_leads=?,total_orders=?,online_revenue=?,offline_revenue=?,total_ad_spend=?,updated_at=datetime(\'now\',\'localtime\') WHERE id=?',
          [total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend, reportId])
        deleteChildRecords(reportId)
      } else {
        execute('INSERT INTO reports (region,year,month,total_leads,total_orders,online_revenue,offline_revenue,total_ad_spend) VALUES (?,?,?,?,?,?,?,?)',
          [region || '', year, month, total_leads, total_orders, online_revenue, offline_revenue, total_ad_spend])
        reportId = (queryOne('SELECT last_insert_rowid() as id') as any).id
      }

      for (const a of (data.organic_accounts || []))
        execute('INSERT INTO organic_accounts (report_id,platform_name,account_name,content_updated,organic_leads) VALUES (?,?,?,?,?)',
          [reportId, a.platform_name, a.account_name, a.content_updated || 0, a.organic_leads || 0])

      for (const a of (data.ad_accounts || []))
        execute('INSERT INTO ad_accounts (report_id,platform_name,account_name,ad_spend,lead_count,lead_cost) VALUES (?,?,?,?,?,?)',
          [reportId, a.platform_name, a.account_name, a.ad_spend || 0, a.lead_count || 0, a.lead_cost || 0])

      for (const c of (data.other_channels || []))
        execute('INSERT INTO other_channels (report_id,channel_name,ad_spend,lead_count,lead_cost,order_count,conversion_rate) VALUES (?,?,?,?,?,?,?)',
          [reportId, c.channel_name, c.ad_spend || 0, c.lead_count || 0, c.lead_cost || 0, c.order_count || 0, c.conversion_rate || 0])

      for (const o of (data.order_entries || []))
        execute('INSERT INTO order_entries (report_id,order_time,order_content,order_status,order_creator,deal_count,product_name,customer_info,contact_info,customer_source,order_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [reportId, o.order_time || '', o.order_content || '', o.order_status || '', o.order_creator || '', o.deal_count || '', o.product_name || '', o.customer_info || '', o.contact_info || '', o.customer_source || '', o.order_amount || 0])

      for (const c of (data.channel_leads || []))
        execute('INSERT INTO channel_leads (report_id,channel_name,lead_count) VALUES (?,?,?)',
          [reportId, c.channel_name, c.lead_count || 0])

      saveToDisk()
      return { success: true }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('db:deleteReport', async (_e, region: string, year: number, month: number) => {
    try {
      const r: any = queryOne('SELECT id FROM reports WHERE region=? AND year=? AND month=?', [region, year, month])
      if (!r) return { success: false, error: '未找到报告' }
      deleteChildRecords(r.id)
      execute('DELETE FROM reports WHERE id=?', [r.id])
      saveToDisk()
      return { success: true }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('db:listReports', async () => {
    try { return queryAll('SELECT * FROM reports ORDER BY year DESC, month DESC') }
    catch { return [] }
  })

  ipcMain.handle('db:getAllReportsForChart', async () => {
    try { return queryAll('SELECT * FROM reports ORDER BY year ASC, month ASC') }
    catch { return [] }
  })

  ipcMain.handle('dialog:openExcel', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择订单Excel文件',
        filters: [{ name: 'Excel文件', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile']
      })
      if (canceled || !filePaths.length) return { success: false, error: '已取消' }

      const XLSX = require('xlsx')
      const wb = XLSX.readFile(filePaths[0])
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

      // Skip header rows (first 2 rows: title + column headers)
      const entries: any[] = []
      for (let i = 2; i < rows.length; i++) {
        const r = rows[i]
        if (!r || r.length < 11) continue
        entries.push({
          order_time: String(r[1] ?? ''),
          order_content: String(r[2] ?? ''),
          order_status: String(r[3] ?? ''),
          order_creator: String(r[4] ?? ''),
          deal_count: String(r[5] ?? ''),
          product_name: String(r[6] ?? ''),
          customer_info: String(r[7] ?? ''),
          contact_info: String(r[8] ?? ''),
          customer_source: String(r[9] ?? ''),
          order_amount: Number(r[10]) || 0
        })
      }
      return { success: true, entries }
    } catch (e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('pdf:generate', async (_e, region: string, year: number, month: number) => {
    try {
      const r: any = queryOne('SELECT * FROM reports WHERE region=? AND year=? AND month=?', [region, year, month])
      if (!r) return { success: false, error: '未找到报告数据' }
      const data = buildReportData(r)
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '保存PDF报告', defaultPath: `${year}年${month}月_${region}_线索数据报告.pdf`,
        filters: [{ name: 'PDF文件', extensions: ['pdf'] }]
      })
      if (canceled || !filePath) return { success: false, error: '已取消' }
      const { generatePdf } = await import('./pdf-generator')
      await generatePdf(data, filePath)
      return { success: true, filePath }
    } catch (e: any) { return { success: false, error: e.message } }
  })
}
