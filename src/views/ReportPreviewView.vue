<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h1 class="page-title" style="margin-bottom:0">{{ year }}年{{ month }}月 — 报告预览</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" @click="router.push(`/report/${year}/${month}?region=${encodeURIComponent(region)}&step=${route.query.step || 2}`)">返回编辑</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存数据' }}
        </button>
        <button class="btn btn-outline" @click="exportPdf" :disabled="exporting">
          {{ exporting ? '正在生成...' : '导出 PDF' }}
        </button>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;color:var(--color-text-secondary)">加载中...</div>

    <div v-else-if="!report" style="text-align:center;padding:60px;color:var(--color-text-secondary)">
      未找到报告数据，请先录入数据。
      <br /><br />
      <button class="btn btn-primary" @click="router.push(`/report/${year}/${month}?region=${encodeURIComponent(region)}`)">前往录入</button>
    </div>

    <div v-else>
      <!-- Cover -->
      <div class="card" style="text-align:center;padding:40px">
        <h1 style="font-size:26px">月度线索数据报告</h1>
        <div style="font-size:20px;color:var(--color-primary);font-weight:bold;margin-top:8px">{{ year }}年{{ month }}月</div>
      </div>

      <!-- KPIs -->
      <div class="card">
        <div class="card-header">一、核心指标</div>
        <div class="grid-3">
          <div class="kpi-card kpi-blue"><div class="kpi-label">新线索总计</div><div class="kpi-value">{{ formatNumber(displayTotalLeads) }}</div></div>
          <div class="kpi-card kpi-purple"><div class="kpi-label">总成交率</div><div class="kpi-value">{{ displayConversionRate }}%</div></div>
          <div class="kpi-card kpi-red"><div class="kpi-label">总投流消耗</div><div class="kpi-value">{{ formatNumber(displayTotalAdSpend) }} 元</div></div>
        </div>
      </div>

      <!-- Order section -->
      <div class="card">
        <div class="card-header">订单情况</div>
        <div class="grid-3" style="margin-bottom:16px">
          <div class="kpi-card kpi-green"><div class="kpi-label">订单数量</div><div class="kpi-value">{{ formatNumber(report.total_orders) }}</div></div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-label">成交金额</div>
            <div class="kpi-value" style="font-size:20px">线上 {{ formatNumber(report.online_revenue) }} 元<br/>其他渠道 {{ formatNumber(report.offline_revenue) }} 元</div>
          </div>
          <div class="kpi-card kpi-purple"><div class="kpi-label">总金额</div><div class="kpi-value">{{ formatNumber(totalRevenue) }} 元</div></div>
        </div>

        <div v-if="report.order_entries?.length" style="overflow-x:auto">
          <div class="card-header" style="font-size:15px">订单明细</div>
          <table class="data-table" style="min-width:1200px">
            <thead><tr>
              <th>#</th><th>订单创建时间</th><th>订单内容</th><th>订单状态</th><th>订单创建人</th>
              <th>成交次数</th><th>产品名称</th><th>客户信息</th><th>联系方式</th><th>客户来源</th><th>订单金额</th>
            </tr></thead>
            <tbody>
              <tr v-for="(o, i) in report.order_entries" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ o.order_time }}</td><td>{{ o.order_content }}</td><td>{{ o.order_status }}</td>
                <td>{{ o.order_creator }}</td><td>{{ o.deal_count }}</td><td>{{ o.product_name }}</td>
                <td>{{ o.customer_info }}</td><td>{{ o.contact_info }}</td><td>{{ o.customer_source }}</td>
                <td>{{ formatNumber(o.order_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Channel leads -->
      <div class="card" v-if="channelData.length > 0">
        <div class="card-header">二、线索渠道来源</div>
        <table class="data-table">
          <thead><tr><th>渠道</th><th>线索数</th><th>占比</th></tr></thead>
          <tbody>
            <tr v-for="ch in channelData" :key="ch.channel_name">
              <td>{{ ch.channel_name }}</td>
              <td>{{ formatNumber(ch.lead_count) }}</td>
              <td>{{ chPct(ch.lead_count) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Organic accounts -->
      <div class="card" v-if="organicGroups.length > 0">
        <div class="card-header">三、账号运营情况</div>
        <div v-for="(g, gi) in organicGroups" :key="gi" style="margin-bottom:12px">
          <h4 style="margin:8px 0 6px;font-size:15px;color:var(--color-text)">{{ g.name || '未命名平台' }}</h4>
          <table class="data-table">
            <thead><tr><th>账号名</th><th>更新数</th><th>自然流线索数</th></tr></thead>
            <tbody>
              <tr v-for="(a, ai) in g.accounts" :key="ai">
                <td>{{ a.account_name }}</td>
                <td>{{ a.content_updated ?? 0 }}</td>
                <td>{{ a.organic_leads ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ad accounts -->
      <div class="card" v-if="adGroups.length > 0">
        <div class="card-header">四、投流情况</div>
        <div v-for="(g, gi) in adGroups" :key="gi" style="margin-bottom:12px">
          <h4 style="margin:8px 0 6px;font-size:15px;color:var(--color-text)">{{ g.name || '未命名平台' }}</h4>
          <table class="data-table">
            <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr></thead>
            <tbody>
              <tr v-for="(a, ai) in g.accounts" :key="ai">
                <td>{{ a.account_name }}</td>
                <td>{{ formatNumber(a.ad_spend) }}</td>
                <td>{{ formatNumber(a.lead_count) }}</td>
                <td>{{ calcCost(a.ad_spend, a.lead_count) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Other channels -->
      <div class="card" v-if="report.other_channels?.length">
        <div class="card-header">五、其他渠道</div>
        <table class="data-table">
          <thead><tr><th>渠道名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in report.other_channels" :key="i">
              <td>{{ c.channel_name }}</td>
              <td>{{ formatNumber(c.ad_spend) }}</td>
              <td>{{ formatNumber(c.lead_count) }}</td>
              <td>{{ calcCost(c.ad_spend, c.lead_count) }}</td>
              <td>{{ formatNumber(c.order_count) }}</td>
              <td>{{ c.lead_count > 0 && c.order_count > 0 ? ((c.order_count / c.lead_count) * 100).toFixed(2) : '0' }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <TrendChart :reports="allReports" title="历史趋势" v-if="allReports.length > 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ipcService } from '@/services/ipcService'
import { useReportStore } from '@/stores/reportStore'
import { formatNumber } from '@/utils/format'
import type { ReportData, ReportSummary } from '@/types'
import TrendChart from '@/components/charts/TrendChart.vue'

const props = defineProps<{ year: number; month: number }>()
const route = useRoute()
const router = useRouter()
const store = useReportStore()
const report = ref<ReportData | null>(null)
const allReports = ref<ReportSummary[]>([])
const loading = ref(true)
const exporting = ref(false)
const saving = ref(false)
const region = computed(() => (route.query.region as string) || '')

const channelData = computed(() => {
  const g = store.generatedChannelLeads
  if (g.length > 0) return g
  return report.value?.channel_leads || []
})

const organicGroups = computed(() => groupBy(report.value?.organic_accounts || [], 'platform_name'))
const adGroups = computed(() => groupBy(report.value?.ad_accounts || [], 'platform_name'))

function groupBy(list: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of list) {
    const k = item[key] || ''
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return Array.from(map.entries()).map(([name, accounts]) => ({ name, accounts }))
}

const displayTotalLeads = computed(() => store.computedTotalLeads || report.value?.total_leads || 0)
const displayTotalAdSpend = computed(() => store.computedTotalAdSpend || report.value?.total_ad_spend || 0)
const displayConversionRate = computed(() => {
  const l = displayTotalLeads.value
  if (!l) return '0.0'
  return ((report.value?.total_orders || 0) / l * 100).toFixed(1)
})
const totalRevenue = computed(() => (report.value?.online_revenue || 0) + (report.value?.offline_revenue || 0))

function calcCost(spend: number, leads: number) {
  return leads > 0 && spend > 0 ? (spend / leads).toFixed(2) : '0'
}
function chPct(count: number) {
  const t = channelData.value.reduce((s: number, c: any) => s + (c.lead_count || 0), 0)
  return t ? ((count / t) * 100).toFixed(1) : '0.0'
}

async function handleSave() {
  saving.value = true
  const r = await store.save()
  saving.value = false
  alert(r.success ? '保存成功' : '保存失败: ' + r.error)
}

async function exportPdf() {
  exporting.value = true
  const r = await ipcService.generatePdf(region.value, props.year, props.month)
  exporting.value = false
  if (r.success) alert('PDF导出成功！')
  else if (r.error !== '已取消') alert('导出失败: ' + r.error)
}

onMounted(async () => {
  if (store.data.region && store.data.year === props.year && store.data.month === props.month) {
    report.value = JSON.parse(JSON.stringify(store.data))
  }
  if (!report.value) {
    const r = await ipcService.getReport(region.value, props.year, props.month)
    if (r && !(r as any).error) report.value = r
  }
  allReports.value = (await ipcService.getAllReportsForChart()) || []
  loading.value = false
})
</script>

<style scoped>
.card-header { font-size: 18px; }
.data-table th { font-size: 14px; padding: 10px 14px; }
.data-table td { font-size: 14px; padding: 10px 14px; }
.kpi-label { font-size: 14px; }
.kpi-value { font-size: 28px; }
.kpi-sub { font-size: 13px; }
h4 { font-size: 16px !important; }
</style>
