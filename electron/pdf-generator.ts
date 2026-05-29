import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v: number) => (v || 0).toLocaleString()
const pct = (v: number, total: number) => total > 0 ? (v / total * 100).toFixed(1) : '0.0'

export async function generatePdf(data: any, outputPath: string): Promise<void> {
  const win = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })
  let done = false
  const ready = new Promise<void>((resolve, reject) => {
    const go = () => { if (!done) { done = true; setTimeout(resolve, 200) } }
    const t = setTimeout(go, 10000)
    win.webContents.once('did-finish-load', () => { clearTimeout(t); go() })
    win.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(t); reject(new Error(`${desc} (${code})`)) })
  })
  try {
    const html = Buffer.from(buildHtml(data), 'utf-8').toString('base64')
    await win.loadURL(`data:text/html;charset=utf-8;base64,${html}`)
    await ready
    writeFileSync(outputPath, await win.webContents.printToPDF({ printBackground: true, landscape: false, pageSize: 'A4' }))
  } finally { win.close() }
}

function groupBy(list: any[], key: string) {
  const m = new Map<string, any[]>()
  for (const i of list) { const k = i[key] || ''; if (!m.has(k)) m.set(k, []); m.get(k)!.push(i) }
  return Array.from(m.entries()).map(([name, items]) => ({ name, items }))
}

function channelLeads(d: any) {
  const m = new Map<string, number>()
  for (const a of d.organic_accounts || []) if (a.organic_leads > 0) m.set(`【自然流】${a.platform_name}`, (m.get(`【自然流】${a.platform_name}`) || 0) + a.organic_leads)
  for (const a of d.ad_accounts || []) if (a.lead_count > 0) m.set(`【投流】${a.platform_name}`, (m.get(`【投流】${a.platform_name}`) || 0) + a.lead_count)
  for (const c of d.other_channels || []) if (c.lead_count > 0) m.set(c.channel_name, (m.get(c.channel_name) || 0) + c.lead_count)
  return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value)
}

function section(title: string, body: string) {
  return `<div class="sec"><div class="st">${title}</div>${body}</div>`
}

function kpiCards(items: { label: string; value: string; color: string }[]) {
  const cards = items.map(i =>
    `<div class="kpi ${i.color}"><div class="kl">${i.label}</div><div class="kv">${i.value}</div></div>`
  ).join('')
  return `<div class="kg">${cards}</div>`
}

function tbl(headers: string[], rows: string[][]) {
  const h = headers.map(h => `<th>${h}</th>`).join('')
  const r = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${h}</tr></thead><tbody>${r}</tbody></table>`
}

function buildHtml(d: any): string {
  const totalRev = n((d.online_revenue || 0) + (d.offline_revenue || 0))
  const convRate = d.total_leads > 0 ? pct(d.total_orders, d.total_leads) : '0.0'
  const ch = channelLeads(d)
  const chTotal = ch.reduce((s: number, c: any) => s + c.value, 0)
  const oG = groupBy(d.organic_accounts || [], 'platform_name')
  const aG = groupBy(d.ad_accounts || [], 'platform_name')

  let html = ''

  html += `<div class="cover"><h1>月度线索数据报告</h1><div class="sub">${d.year}年${d.month}月</div></div>`

  html += section('一、核心指标', kpiCards([
    { label: '新线索总计', value: n(d.total_leads), color: 'blue' },
    { label: '订单数量', value: n(d.total_orders), color: 'green' },
    { label: '成交金额', value: `线上 ${n(d.online_revenue)} 元<br>其他渠道 ${n(d.offline_revenue)} 元`, color: 'orange' },
    { label: '总成交率', value: `${convRate}%`, color: 'purple' },
    { label: '总投流消耗', value: `${n(d.total_ad_spend)} 元`, color: 'red' },
    { label: '总金额', value: `${totalRev} 元`, color: 'teal' },
  ]))

  if (ch.length) {
    html += section('二、线索渠道来源',
      tbl(['渠道', '线索数', '占比'], ch.map(c => [esc(c.name), n(c.value), `${pct(c.value, chTotal)}%`]))
    )
  }

  if (oG.length) {
    let body = ''
    for (const g of oG) {
      body += `<div class="sub-t">${esc(g.name || '未命名')}</div>`
      body += tbl(['账号名', '更新数', '自然流线索数'], g.items.map((a: any) => [esc(a.account_name), String(a.content_updated || 0), String(a.organic_leads || 0)]))
    }
    html += section('三、账号运营情况', body)
  }

  if (aG.length) {
    let body = ''
    for (const g of aG) {
      body += `<div class="sub-t">${esc(g.name || '未命名')}</div>`
      body += tbl(['投流账号名', '消耗金额（元）', '线索数', '线索成本（元）'],
        g.items.map((a: any) => [esc(a.account_name), n(a.ad_spend), n(a.lead_count), n(a.lead_cost)]))
    }
    html += section('四、投流情况', body)
  }

  if ((d.other_channels || []).length) {
    html += section('五、其他渠道情况',
      tbl(['渠道名', '消耗金额（元）', '线索数', '线索成本（元）', '成交数', '成交率'],
        d.other_channels.map((c: any) => [esc(c.channel_name), n(c.ad_spend), n(c.lead_count), n(c.lead_cost), String(c.order_count || 0), `${c.conversion_rate || 0}%`]))
    )
  }

  if ((d.order_entries || []).length) {
    html += section('六、订单明细',
      tbl(['#', '订单创建时间', '订单内容', '订单状态', '订单创建人', '成交次数', '产品名称', '客户信息', '联系方式', '客户来源', '订单金额'],
        d.order_entries.map((o: any, i: number) => [
          String(i + 1), esc(o.order_time), esc(o.order_content), esc(o.order_status),
          esc(o.order_creator), esc(o.deal_count), esc(o.product_name), esc(o.customer_info),
          esc(o.contact_info), esc(o.customer_source), n(o.order_amount)
        ])
      ))
  }

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei','SimHei',sans-serif;color:#2c3e50;font-size:11px;line-height:1.4;padding:10px 16px}
.cover{text-align:center;padding:16px 0 10px;border-bottom:2px solid #2980b9;margin-bottom:10px}
.cover h1{font-size:22px;color:#1e293b;margin-bottom:3px}
.cover .sub{font-size:15px;color:#2980b9;font-weight:bold}
.sec{margin-bottom:10px}
.st{font-size:15px;color:#1e293b;border-left:4px solid #2980b9;padding-left:8px;margin-bottom:6px;font-weight:bold}
.kg{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px}
.kpi{flex:0 0 calc(33.33% - 4px);background:#f8fafc;border-radius:4px;padding:8px 10px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:44px}
.kl{font-size:10px;color:#64748b;margin-bottom:2px}
.kv{font-size:16px;font-weight:bold;color:#1e293b;line-height:1.2}
.blue{border-top:3px solid #2980b9}.green{border-top:3px solid #27ae60}
.orange{border-top:3px solid #e67e22}.purple{border-top:3px solid #8e44ad}
.red{border-top:3px solid #c0392b}.teal{border-top:3px solid #16a085}
table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:10px}
th{background:#2980b9;color:#fff;padding:3px 6px;text-align:center;font-weight:bold}
td{padding:3px 6px;text-align:center;border-bottom:1px solid #e2e8f0}
tr:nth-child(even) td{background:#f8fafc}
.sub-t{font-size:12px;font-weight:bold;color:#1e293b;margin:6px 0 3px;padding-left:5px;border-left:3px solid #bdc3c7}
@media print{.sec{page-break-inside:avoid}table{page-break-inside:avoid}tr{page-break-inside:avoid}}
</style></head><body>${html}</body></html>`
}
