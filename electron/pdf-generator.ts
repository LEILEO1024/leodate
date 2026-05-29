import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function generatePdf(data: any, outputPath: string): Promise<void> {
  const html = buildHtml(data)

  const win = new BrowserWindow({
    width: 800, height: 600, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  let loaded = false
  const ready = new Promise<void>((resolve, reject) => {
    const done = () => { if (!loaded) { loaded = true; setTimeout(resolve, 300) } }
    const t = setTimeout(() => done(), 10000)
    win.webContents.once('did-finish-load', () => { clearTimeout(t); done() })
    win.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(t); reject(new Error(`${desc} (${code})`)) })
  })

  try {
    await win.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf-8').toString('base64')}`)
    await ready
    const pdf = await win.webContents.printToPDF({ printBackground: true, landscape: false, pageSize: 'A4' })
    writeFileSync(outputPath, pdf)
  } finally { win.close() }
}

function buildHtml(d: any): string {
  const totalRev = (d.online_revenue || 0) + (d.offline_revenue || 0)
  const convRate = d.total_leads > 0 ? ((d.total_orders / d.total_leads) * 100).toFixed(1) : '0.0'

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei','SimHei',sans-serif;color:#2c3e50;font-size:11px;line-height:1.5;padding:14px}
.cover{text-align:center;padding:28px 0 18px;border-bottom:3px solid #2980b9;margin-bottom:16px}
.cover h1{font-size:24px;color:#1e293b;margin-bottom:6px}
.cover .sub{font-size:16px;color:#2980b9;font-weight:bold}
.section{margin-bottom:16px}
.st{font-size:17px;color:#1e293b;border-left:4px solid #2980b9;padding-left:8px;margin-bottom:10px;font-weight:bold}
.kpi-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.kpi{flex:0 0 calc(33.33% - 6px);background:#f8fafc;border-radius:5px;padding:11px;border:1px solid #e2e8f0}
.kpi .l{font-size:10px;color:#64748b;margin-bottom:3px}
.kpi .v{font-size:20px;font-weight:bold;color:#1e293b}
.kpi.blue{border-top:3px solid #2980b9}.kpi.green{border-top:3px solid #27ae60}
.kpi.orange{border-top:3px solid #e67e22}.kpi.purple{border-top:3px solid #8e44ad}
.kpi.red{border-top:3px solid #c0392b}.kpi.teal{border-top:3px solid #16a085}
table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:11px}
th{background:#2980b9;color:#fff;padding:5px 8px;text-align:center;font-weight:bold}
td{padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0}
tr:nth-child(even) td{background:#f8fafc}
.sub-t{font-size:14px;font-weight:bold;color:#1e293b;margin:10px 0 6px;padding-left:6px;border-left:3px solid #bdc3c7}
.summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.si{background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;padding:6px 12px}
.si .l{font-size:10px;color:#64748b}.si .v{font-size:14px;font-weight:bold;color:#0369a1}
@media print{.section{page-break-inside:avoid}table{page-break-inside:avoid}tr{page-break-inside:avoid}}
</style></head><body>
<div class="cover"><h1>月度线索数据报告</h1><div class="sub">${d.year}年${d.month}月</div></div>

<div class="section">
<div class="st">一、核心指标</div>
<div class="kpi-grid">
<div class="kpi blue"><div class="l">新线索总计</div><div class="v">${(d.total_leads||0).toLocaleString()}</div></div>
<div class="kpi green"><div class="l">总订单数</div><div class="v">${(d.total_orders||0).toLocaleString()}</div></div>
<div class="kpi orange"><div class="l">总成交金额</div><div class="v">${totalRev.toLocaleString()} 元</div></div>
<div class="kpi purple"><div class="l">总成交率</div><div class="v">${convRate}%</div></div>
<div class="kpi red"><div class="l">总投流消耗</div><div class="v">${(d.total_ad_spend||0).toLocaleString()} 元</div></div>
<div class="kpi teal"><div class="l">线上 / 其他渠道成交</div><div class="v" style="font-size:18px">${(d.online_revenue||0).toLocaleString()} / ${(d.offline_revenue||0).toLocaleString()} 元</div></div>
</div>
</div>

${chanSection(d)}
${douyinSection(d)}
${xhsSection(d)}
${otherSection(d)}
</body></html>`
}

function chanSection(d: any): string {
  if (!d.channel_leads?.length) return ''
  const total = d.channel_leads.reduce((s: any, c: any) => s + (c.lead_count || 0), 0)
  const rows = [...d.channel_leads].sort((a: any, b: any) => (b.lead_count || 0) - (a.lead_count || 0))
    .map((c: any) => {
      const pct = total > 0 ? ((c.lead_count / total) * 100).toFixed(1) : '0.0'
      return `<tr><td>${esc(c.channel_name)}</td><td>${(c.lead_count||0).toLocaleString()}</td><td>${pct}%</td></tr>`
    }).join('')
  return `<div class="section"><div class="st">二、线索渠道来源</div><table><tr><th>渠道</th><th>线索数</th><th>占比</th></tr>${rows}</table></div>`
}

function douyinSection(d: any): string {
  if (!d.douyin_accounts?.length && !d.douyin_ad_accounts?.length) return ''
  let html = '<div class="section"><div class="st">三、抖音精细数据</div>'
  if (d.douyin_accounts?.length) {
    const rows = d.douyin_accounts.map((a: any) =>
      `<tr><td>${esc(a.account_name)}</td><td>${a.videos_updated||0}</td><td>${a.organic_leads||0}</td></tr>`
    ).join('')
    html += `<div class="sub-t">各账号数据</div><table><tr><th>账号名</th><th>更新视频数</th><th>自然流线索数</th></tr>${rows}</table>`
  }
  if (d.douyin_ad_accounts?.length) {
    const rows = d.douyin_ad_accounts.map((a: any) =>
      `<tr><td>${esc(a.account_name)}</td><td>${(a.ad_spend||0).toLocaleString()}</td><td>${(a.lead_count||0).toLocaleString()}</td><td>${(a.lead_cost||0).toLocaleString()}</td></tr>`
    ).join('')
    html += `<div class="sub-t">投流汇总</div><table><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr>${rows}</table>`
  }
  return html + '</div>'
}

function xhsSection(d: any): string {
  if (!d.xiaohongshu_accounts?.length && !d.xiaohongshu_ad_accounts?.length) return ''
  let html = '<div class="section"><div class="st">四、小红书精细数据</div>'
  if (d.xiaohongshu_accounts?.length) {
    const rows = d.xiaohongshu_accounts.map((a: any) =>
      `<tr><td>${esc(a.account_name)}</td><td>${a.posts_updated||0}</td><td>${a.organic_leads||0}</td></tr>`
    ).join('')
    html += `<div class="sub-t">各账号数据</div><table><tr><th>账号名</th><th>更新图文数</th><th>自然流线索数</th></tr>${rows}</table>`
  }
  if (d.xiaohongshu_ad_accounts?.length) {
    const rows = d.xiaohongshu_ad_accounts.map((a: any) =>
      `<tr><td>${esc(a.account_name)}</td><td>${(a.ad_spend||0).toLocaleString()}</td><td>${(a.lead_count||0).toLocaleString()}</td><td>${(a.lead_cost||0).toLocaleString()}</td></tr>`
    ).join('')
    html += `<div class="sub-t">投流汇总</div><table><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr>${rows}</table>`
  }
  return html + '</div>'
}

function otherSection(d: any): string {
  if (!d.other_sources?.length) return ''
  const rows = d.other_sources.map((s: any) =>
    `<tr><td>${esc(s.source_name)}</td><td>${(s.lead_count||0).toLocaleString()}</td><td>${(s.lead_cost||0).toLocaleString()}</td><td>${s.order_count||0}</td><td>${s.conversion_rate||0}%</td></tr>`
  ).join('')
  return `<div class="section"><div class="st">五、其他来源数据</div><table><tr><th>来源</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率</th></tr>${rows}</table></div>`
}
