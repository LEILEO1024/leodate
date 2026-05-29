import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function generatePdf(data: any, outputPath: string): Promise<void> {
  const html = buildHtml(data)
  const win = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })
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
    writeFileSync(outputPath, await win.webContents.printToPDF({ printBackground: true, landscape: false, pageSize: 'A4' }))
  } finally { win.close() }
}

function groupBy(list: any[], key: string) {
  const m = new Map<string, any[]>()
  for (const i of list) { const k = i[key] || ''; if (!m.has(k)) m.set(k, []); m.get(k)!.push(i) }
  return Array.from(m.entries()).map(([n, a]) => ({ name: n, accounts: a }))
}

function buildHtml(d: any): string {
  const rev = (d.online_revenue || 0) + (d.offline_revenue || 0)
  const conv = d.total_leads > 0 ? ((d.total_orders / d.total_leads) * 100).toFixed(1) : '0.0'

  // Build channel leads
  const chMap = new Map<string, number>()
  for (const a of d.organic_accounts || []) { if (a.organic_leads > 0) chMap.set(`${a.platform_name}(自然流)`, (chMap.get(`${a.platform_name}(自然流)`) || 0) + (a.organic_leads || 0)) }
  for (const a of d.ad_accounts || []) { if (a.lead_count > 0) chMap.set(`${a.platform_name}(投流)`, (chMap.get(`${a.platform_name}(投流)`) || 0) + (a.lead_count || 0)) }
  for (const c of d.other_channels || []) { if (c.lead_count > 0) chMap.set(c.channel_name, (chMap.get(c.channel_name) || 0) + (c.lead_count || 0)) }
  const channels = Array.from(chMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a: any, b: any) => b.value - a.value)
  const chTotal = channels.reduce((s: number, c: any) => s + c.value, 0)

  const oGroups = groupBy(d.organic_accounts || [], 'platform_name')
  const aGroups = groupBy(d.ad_accounts || [], 'platform_name')

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei','SimHei',sans-serif;color:#2c3e50;font-size:11px;line-height:1.4;padding:10px 16px}
.cover{text-align:center;padding:16px 0 10px;border-bottom:2px solid #2980b9;margin-bottom:10px}
.cover h1{font-size:22px;color:#1e293b;margin-bottom:3px}
.cover .sub{font-size:15px;color:#2980b9;font-weight:bold}
.section{margin-bottom:12px}
.st{font-size:15px;color:#1e293b;border-left:4px solid #2980b9;padding-left:8px;margin-bottom:7px;font-weight:bold}
.kpi-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.kpi{flex:0 0 calc(33.33% - 4px);background:#f8fafc;border-radius:4px;padding:10px 10px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:48px}
.kpi .l{font-size:10px;color:#64748b;margin-bottom:3px}
.kpi .v{font-size:17px;font-weight:bold;color:#1e293b;line-height:1.2}
.kpi.blue{border-top:3px solid #2980b9}.kpi.green{border-top:3px solid #27ae60}
.kpi.orange{border-top:3px solid #e67e22}.kpi.purple{border-top:3px solid #8e44ad}
.kpi.red{border-top:3px solid #c0392b}.kpi.teal{border-top:3px solid #16a085}
table{width:100%;border-collapse:collapse;margin-bottom:5px;font-size:11px}
th{background:#2980b9;color:#fff;padding:4px 7px;text-align:center;font-weight:bold}
td{padding:5px 7px;text-align:center;border-bottom:1px solid #e2e8f0}
tr:nth-child(even) td{background:#f8fafc}
.sub-t{font-size:13px;font-weight:bold;color:#1e293b;margin:7px 0 5px;padding-left:6px;border-left:3px solid #bdc3c7}
@media print{.section{page-break-inside:avoid}table{page-break-inside:avoid}tr{page-break-inside:avoid}}
</style></head><body>
<div class="cover"><h1>月度线索数据报告</h1><div class="sub">${d.year}年${d.month}月</div></div>

<div class="section"><div class="st">一、核心指标</div>
<div class="kpi-grid">
<div class="kpi blue"><div class="l">新线索总计</div><div class="v">${(d.total_leads||0).toLocaleString()}</div></div>
<div class="kpi purple"><div class="l">总成交率</div><div class="v">${conv}%</div></div>
<div class="kpi red"><div class="l">总投流消耗</div><div class="v">${(d.total_ad_spend||0).toLocaleString()} 元</div></div>
</div></div>

<div class="section"><div class="st">订单情况</div>
<div class="kpi-grid">
<div class="kpi green"><div class="l">订单数量</div><div class="v">${(d.total_orders||0).toLocaleString()}</div></div>
<div class="kpi orange"><div class="l">成交金额</div><div class="v" style="font-size:16px">线上 ${(d.online_revenue||0).toLocaleString()} 元<br>其他渠道 ${(d.offline_revenue||0).toLocaleString()} 元</div></div>
<div class="kpi purple"><div class="l">总金额</div><div class="v">${rev.toLocaleString()} 元</div></div>
</div>
${(d.order_entries||[]).length ? `<table><tr><th>#</th><th>订单创建时间</th><th>订单内容</th><th>订单状态</th><th>订单创建人</th><th>成交次数</th><th>产品名称</th><th>客户信息</th><th>联系方式</th><th>客户来源</th><th>订单金额</th></tr>${d.order_entries.map((o:any,i:number)=>`<tr><td>${i+1}</td><td>${esc(o.order_time||'')}</td><td>${esc(o.order_content||'')}</td><td>${esc(o.order_status||'')}</td><td>${esc(o.order_creator||'')}</td><td>${esc(o.deal_count||'')}</td><td>${esc(o.product_name||'')}</td><td>${esc(o.customer_info||'')}</td><td>${esc(o.contact_info||'')}</td><td>${esc(o.customer_source||'')}</td><td>${(o.order_amount||0).toLocaleString()}</td></tr>`).join('')}</table>` : ''}
</div></div>

${channels.length ? `<div class="section"><div class="st">二、线索渠道来源</div><table><tr><th>渠道</th><th>线索数</th><th>占比</th></tr>${channels.map((c: any) => `<tr><td>${esc(c.name)}</td><td>${c.value.toLocaleString()}</td><td>${chTotal>0?(c.value/chTotal*100).toFixed(1):'0'}%</td></tr>`).join('')}</table></div>` : ''}

${oGroups.length ? `<div class="section"><div class="st">三、账号运营情况</div>${oGroups.map((g: any) => `<div class="sub-t">${esc(g.name||'未命名')}</div><table><tr><th>账号名</th><th>更新数</th><th>自然流线索数</th></tr>${g.accounts.map((a: any) => `<tr><td>${esc(a.account_name)}</td><td>${a.content_updated||0}</td><td>${a.organic_leads||0}</td></tr>`).join('')}</table>`).join('')}</div>` : ''}

${aGroups.length ? `<div class="section"><div class="st">四、投流情况</div>${aGroups.map((g: any) => `<div class="sub-t">${esc(g.name||'未命名')}</div><table><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr>${g.accounts.map((a: any) => `<tr><td>${esc(a.account_name)}</td><td>${(a.ad_spend||0).toLocaleString()}</td><td>${(a.lead_count||0).toLocaleString()}</td><td>${(a.lead_cost||0).toLocaleString()}</td></tr>`).join('')}</table>`).join('')}</div>` : ''}

${(d.other_channels || []).length ? `<div class="section"><div class="st">五、其他渠道情况</div><table><tr><th>渠道名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率</th></tr>${d.other_channels.map((c: any) => `<tr><td>${esc(c.channel_name)}</td><td>${(c.ad_spend||0).toLocaleString()}</td><td>${(c.lead_count||0).toLocaleString()}</td><td>${(c.lead_cost||0).toLocaleString()}</td><td>${c.order_count||0}</td><td>${c.conversion_rate||0}%</td></tr>`).join('')}</table></div>` : ''}

</body></html>`
}
