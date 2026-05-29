<template>
  <div class="page">
    <h1 class="page-title">月度对比</h1>

    <div class="card">
      <div class="card-header">选择对比报告</div>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;gap:8px;align-items:center;flex:1">
          <span style="font-size:13px;color:var(--color-text-secondary);white-space:nowrap">报告A:</span>
          <select v-model="selA" class="form-input" style="flex:1;min-width:200px">
            <option value="">请选择</option>
            <option v-for="r in reports" :key="'a'+r.id" :value="r.id">{{ r.region }} — {{ r.year }}年{{ r.month }}月</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex:1">
          <span style="font-size:13px;color:var(--color-text-secondary);white-space:nowrap">报告B:</span>
          <select v-model="selB" class="form-input" style="flex:1;min-width:200px">
            <option value="">请选择</option>
            <option v-for="r in reports" :key="'b'+r.id" :value="r.id">{{ r.region }} — {{ r.year }}年{{ r.month }}月</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="loadCompare" :disabled="!selA || !selB">对比</button>
      </div>
    </div>

    <div v-if="reportA && reportB">
      <div class="card">
        <div class="card-header">核心指标对比</div>
        <table class="data-table">
          <thead>
            <tr><th>指标</th><th>{{ labelA }}</th><th>{{ labelB }}</th><th>变化</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in comparisons" :key="c.label">
              <td>{{ c.label }}</td>
              <td>{{ c.valueA }}</td>
              <td>{{ c.valueB }}</td>
              <td :style="{ color: c.deltaNum > 0 ? 'var(--color-success)' : c.deltaNum < 0 ? 'var(--color-danger)' : '' }">{{ c.delta }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">线索渠道对比</div>
        <table class="data-table">
          <thead>
            <tr><th>渠道</th><th>{{ labelA }}</th><th>{{ labelB }}</th><th>变化</th></tr>
          </thead>
          <tbody>
            <tr v-for="ch in channelComparisons" :key="ch.name">
              <td>{{ ch.name }}</td>
              <td>{{ ch.valueA.toLocaleString() }}</td>
              <td>{{ ch.valueB.toLocaleString() }}</td>
              <td :style="{ color: ch.deltaNum > 0 ? 'var(--color-success)' : ch.deltaNum < 0 ? 'var(--color-danger)' : '' }">{{ ch.delta }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="reports.length < 2" class="card" style="text-align:center;padding:40px;color:var(--color-text-secondary)">
      需要至少两份报告才能对比，请先创建报告
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ipcService } from '@/services/ipcService'
import type { ReportData, ReportSummary } from '@/types'

const reports = ref<ReportSummary[]>([])
const selA = ref<number | ''>('')
const selB = ref<number | ''>('')
const reportA = ref<ReportData | null>(null)
const reportB = ref<ReportData | null>(null)
const labelA = ref('')
const labelB = ref('')
const comparisons = ref<any[]>([])
const channelComparisons = ref<any[]>([])

function deltaStr(a: number, b: number) {
  const d = b - a
  const pct = a !== 0 ? ((d / a) * 100).toFixed(1) + '%' : '-'
  const sign = d > 0 ? '+' : ''
  return { delta: `${sign}${d.toLocaleString()} (${sign}${pct})`, deltaNum: d }
}

async function loadCompare() {
  const ra = reports.value.find(r => r.id === selA.value)
  const rb = reports.value.find(r => r.id === selB.value)
  if (!ra || !rb) return

  labelA.value = `${ra.region} ${ra.year}年${ra.month}月`
  labelB.value = `${rb.region} ${rb.year}年${rb.month}月`

  const [a, b] = await Promise.all([
    ipcService.getReport(ra.region, ra.year, ra.month),
    ipcService.getReport(rb.region, rb.year, rb.month)
  ])
  reportA.value = a
  reportB.value = b
  if (!a || !b) return

  const revA = (a.online_revenue || 0) + (a.offline_revenue || 0)
  const revB = (b.online_revenue || 0) + (b.offline_revenue || 0)
  const rateA = a.total_leads ? (a.total_orders / a.total_leads * 100) : 0
  const rateB = b.total_leads ? (b.total_orders / b.total_leads * 100) : 0

  comparisons.value = [
    { label: '新线索总计', valueA: a.total_leads.toLocaleString(), valueB: b.total_leads.toLocaleString(), ...deltaStr(a.total_leads, b.total_leads) },
    { label: '总订单数', valueA: a.total_orders.toLocaleString(), valueB: b.total_orders.toLocaleString(), ...deltaStr(a.total_orders, b.total_orders) },
    { label: '总成交金额', valueA: revA.toLocaleString() + '元', valueB: revB.toLocaleString() + '元', ...deltaStr(revA, revB) },
    { label: '总成交率', valueA: rateA.toFixed(1) + '%', valueB: rateB.toFixed(1) + '%', ...deltaStr(rateA, rateB) },
    { label: '总投流消耗', valueA: a.total_ad_spend.toLocaleString() + '元', valueB: b.total_ad_spend.toLocaleString() + '元', ...deltaStr(a.total_ad_spend, b.total_ad_spend) }
  ]

  const allChannels = new Map<string, { vA: number; vB: number }>()
  for (const c of a.channel_leads) allChannels.set(c.channel_name, { vA: c.lead_count || 0, vB: 0 })
  for (const c of b.channel_leads) {
    const e = allChannels.get(c.channel_name)
    if (e) e.vB = c.lead_count || 0
    else allChannels.set(c.channel_name, { vA: 0, vB: c.lead_count || 0 })
  }
  channelComparisons.value = Array.from(allChannels.entries()).map(([name, { vA, vB }]) => ({
    name, valueA: vA, valueB: vB, ...deltaStr(vA, vB)
  }))
}

onMounted(async () => {
  reports.value = await ipcService.listReports()
})
</script>
