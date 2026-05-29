import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generatePdf(reportData: any, outputPath: string): Promise<void> {
  const html = buildReportHtml(reportData)

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  let loaded = false
  const pageReady = new Promise<void>((resolve, reject) => {
    const done = () => {
      if (loaded) return
      loaded = true
      setTimeout(resolve, 300)
    }

    const timeout = setTimeout(() => {
      done()
    }, 10000)

    win.webContents.once('did-finish-load', () => {
      clearTimeout(timeout)
      done()
    })

    win.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      clearTimeout(timeout)
      reject(new Error(`Page load failed: ${errorDescription} (${errorCode})`))
    })
  })

  try {
    const encodedHtml = Buffer.from(html, 'utf-8').toString('base64')
    await win.loadURL(`data:text/html;charset=utf-8;base64,${encodedHtml}`)
    await pageReady

    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4'
    })

    writeFileSync(outputPath, pdfData)
  } finally {
    win.close()
  }
}

function buildReportHtml(data: any): string {
  const totalRevenue = (data.online_revenue || 0) + (data.offline_revenue || 0)
  const conversionRate = data.total_leads > 0
    ? ((data.total_orders / data.total_leads) * 100).toFixed(1)
    : '0.0'

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
    color: #2c3e50; font-size: 12px; line-height: 1.5; padding: 16px;
  }
  .cover {
    text-align: center; padding: 36px 0 24px;
    border-bottom: 3px solid #2980b9; margin-bottom: 20px;
  }
  .cover h1 { font-size: 28px; color: #1e293b; margin-bottom: 8px; letter-spacing: 2px; }
  .cover .subtitle { font-size: 18px; color: #2980b9; font-weight: bold; }
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 19px; color: #1e293b;
    border-left: 4px solid #2980b9; padding-left: 10px;
    margin-bottom: 12px; font-weight: bold;
  }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
  .kpi-card {
    flex: 0 0 calc(33.33% - 7px); background: #f8fafc;
    border-radius: 6px; padding: 14px; border: 1px solid #e2e8f0;
  }
  .kpi-card .label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
  .kpi-card .value { font-size: 24px; font-weight: bold; color: #1e293b; }
  .kpi-card.accent-blue { border-top: 3px solid #2980b9; }
  .kpi-card.accent-green { border-top: 3px solid #27ae60; }
  .kpi-card.accent-orange { border-top: 3px solid #e67e22; }
  .kpi-card.accent-purple { border-top: 3px solid #8e44ad; }
  .kpi-card.accent-red { border-top: 3px solid #c0392b; }
  .kpi-card.accent-teal { border-top: 3px solid #16a085; }
  .kpi-card .kpi-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
  th { background: #2980b9; color: #fff; padding: 7px 10px; text-align: center; font-weight: bold; }
  td { padding: 6px 10px; text-align: center; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
  .summary-item {
    background: #f0f9ff; border: 1px solid #bae6fd;
    border-radius: 4px; padding: 8px 14px;
  }
  .summary-item .label { font-size: 11px; color: #64748b; }
  .summary-item .value { font-size: 16px; font-weight: bold; color: #0369a1; }
  @page { size: A4; margin: 14mm 12mm; }
  .chart-section { border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 16px; }
  .bar-row { display: flex; align-items: center; margin-bottom: 8px; }
  .bar-label { width: 80px; text-align: right; padding-right: 10px; font-size: 11px; color: #475569; flex-shrink: 0; }
  .bar-track { flex: 1; height: 22px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-val { width: 70px; padding-left: 10px; font-size: 11px; color: #334155; flex-shrink: 0; }
  .bar-colors :nth-child(1) .bar-fill { background: linear-gradient(90deg, #1a73e8, #4285f4); }
  .bar-colors :nth-child(2) .bar-fill { background: linear-gradient(90deg, #ea4335, #f06292); }
  .bar-colors :nth-child(3) .bar-fill { background: linear-gradient(90deg, #34a853, #66bb6a); }
  .bar-colors :nth-child(4) .bar-fill { background: linear-gradient(90deg, #fbbc04, #ffca28); }
  .bar-colors :nth-child(5) .bar-fill { background: linear-gradient(90deg, #8e24aa, #ab47bc); }
  .bar-colors :nth-child(6) .bar-fill { background: linear-gradient(90deg, #00897b, #26a69a); }
  .bar-colors :nth-child(7) .bar-fill { background: linear-gradient(90deg, #e65100, #ff7043); }
  .bar-colors :nth-child(8) .bar-fill { background: linear-gradient(90deg, #0277bd, #29b6f6); }
  .bar-colors :nth-child(9) .bar-fill { background: linear-gradient(90deg, #6d4c41, #a1887f); }
  .bar-colors :nth-child(10) .bar-fill { background: linear-gradient(90deg, #4527a0, #7e57c2); }
  @media print {
    .section { page-break-inside: avoid; }
    table { page-break-inside: avoid; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1>月度线索数据报告</h1>
  <div class="subtitle">${data.year}年${data.month}月</div>
</div>

<div class="section">
  <div class="section-title">一、核心指标</div>
  <div class="kpi-grid">
    <div class="kpi-card accent-blue"><div class="label">新线索总计</div><div class="value">${(data.total_leads || 0).toLocaleString()}</div></div>
    <div class="kpi-card accent-green"><div class="label">总订单数</div><div class="value">${(data.total_orders || 0).toLocaleString()}</div></div>
    <div class="kpi-card accent-orange"><div class="label">总成交金额</div><div class="value">${totalRevenue.toLocaleString()} 元</div></div>
    <div class="kpi-card accent-purple"><div class="label">总成交率</div><div class="value">${conversionRate}%</div></div>
    <div class="kpi-card accent-red"><div class="label">总投流消耗</div><div class="value">${(data.total_ad_spend || 0).toLocaleString()} 元</div></div>
    <div class="kpi-card accent-teal"><div class="label">线上 / 其他渠道成交</div><div class="value" style="font-size:22px">${(data.online_revenue || 0).toLocaleString()} / ${(data.offline_revenue || 0).toLocaleString()} 元</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">二、线索渠道来源</div>
  <table>
    <tr><th>渠道</th><th>线索数</th><th>占比</th></tr>
    ${buildChannelRows(data.channel_leads)}
  </table>
  ${buildChannelBarChart(data.channel_leads)}
</div>

<div class="section">
  <div class="section-title">三、成交来源数据</div>
  <table>
    <tr><th>来源</th><th>成交数</th><th>成交金额（元）</th><th>成交率</th></tr>
    ${(data.deal_sources || []).map((s: any) => `<tr><td>${escapeHtml(s.source_name)}</td><td>${s.order_count || 0}</td><td>${(s.revenue || 0).toLocaleString()}</td><td>${s.conversion_rate || 0}%</td></tr>`).join('')}
  </table>
</div>

</body>
</html>`
}

function buildChannelRows(channelLeads: any[]): string {
  if (!channelLeads || channelLeads.length === 0) {
    return '<tr><td colspan="3">暂无数据</td></tr>'
  }
  const sorted = [...channelLeads].sort((a, b) => (b.lead_count || 0) - (a.lead_count || 0))
  const total = sorted.reduce((sum: number, c: any) => sum + (c.lead_count || 0), 0)
  return sorted.map((c: any) => {
    const pct = total > 0 ? ((c.lead_count / total) * 100).toFixed(1) : '0.0'
    return `<tr><td>${escapeHtml(c.channel_name)}</td><td>${(c.lead_count || 0).toLocaleString()}</td><td>${pct}%</td></tr>`
  }).join('')
}

function buildChannelBarChart(channelLeads: any[]): string {
  if (!channelLeads || channelLeads.length === 0) return ''
  const sorted = [...channelLeads].sort((a, b) => (b.lead_count || 0) - (a.lead_count || 0))
  const max = Math.max(...sorted.map((c: any) => c.lead_count || 0), 1)
  const rows = sorted.map((c: any) => {
    const count = c.lead_count || 0
    const pct = Math.round((count / max) * 100)
    return `<div class="bar-row">
      <div class="bar-label">${escapeHtml(c.channel_name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-val">${count.toLocaleString()}</div>
    </div>`
  }).join('')
  return `<div class="chart-section bar-colors">${rows}</div>`
}
