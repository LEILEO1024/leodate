<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h1 class="page-title" style="margin-bottom:0">{{ year }}年{{ month }}月 — 报告预览</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" @click="router.push(`/report/${year}/${month}?region=${encodeURIComponent(region)}`)">返回编辑</button>
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
        <div style="font-size:12px;color:var(--color-text-secondary);margin-top:12px">生成日期: {{ today }}</div>
      </div>

      <!-- Module 1: KPIs -->
      <div class="card">
        <div class="card-header">一、核心指标</div>
        <div class="grid-3">
          <div class="kpi-card kpi-blue">
            <div class="kpi-label">新线索总计</div>
            <div class="kpi-value">{{ formatNumber(displayTotalLeads) }}</div>
          </div>
          <div class="kpi-card kpi-green">
            <div class="kpi-label">总订单数</div>
            <div class="kpi-value">{{ formatNumber(report.total_orders) }}</div>
          </div>
          <div class="kpi-card kpi-orange">
            <div class="kpi-label">总成交金额</div>
            <div class="kpi-value">{{ formatNumber(totalRevenue) }} 元</div>
            <div class="kpi-sub">线上 {{ formatNumber(report.online_revenue) }} / 其他渠道 {{ formatNumber(report.offline_revenue) }}</div>
          </div>
          <div class="kpi-card kpi-purple">
            <div class="kpi-label">总成交率</div>
            <div class="kpi-value">{{ displayConversionRate }}%</div>
          </div>
          <div class="kpi-card kpi-red">
            <div class="kpi-label">总投流消耗</div>
            <div class="kpi-value">{{ formatNumber(displayTotalAdSpend) }} 元</div>
          </div>
        </div>
      </div>

      <!-- Module 2: Channel leads (generated from store) -->
      <div class="card" v-if="channelData.length > 0">
        <div class="card-header">二、线索渠道来源</div>
        <table class="data-table">
          <thead><tr><th>渠道</th><th>线索数</th><th>占比</th></tr></thead>
          <tbody>
            <tr v-for="ch in channelData" :key="ch.channel_name">
              <td>{{ ch.channel_name }}</td>
              <td>{{ formatNumber(ch.lead_count) }}</td>
              <td>{{ getChannelPercent(ch.lead_count) }}%</td>
            </tr>
          </tbody>
        </table>
        <PieChart
          :channelData="channelData.map(c => ({ name: c.channel_name, value: c.lead_count }))"
          title="渠道占比"
        />
      </div>

      <!-- Module 3: Douyin -->
      <div class="card" v-if="report.douyin_accounts?.length || report.douyin_ad_accounts?.length">
        <div class="card-header">三、抖音精细数据</div>

        <template v-if="report.douyin_accounts?.length">
          <h4 style="margin:12px 0 8px;font-size:14px;color:var(--color-text-secondary)">各账号数据</h4>
          <table class="data-table">
            <thead><tr><th>账号名</th><th>更新视频数</th><th>自然流线索数</th></tr></thead>
            <tbody>
              <tr v-for="(a, i) in report.douyin_accounts" :key="i">
                <td>{{ a.account_name }}</td>
                <td>{{ a.videos_updated ?? 0 }}</td>
                <td>{{ a.organic_leads ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="report.douyin_ad_accounts?.length">
          <h4 style="margin:12px 0 8px;font-size:14px;color:var(--color-text-secondary)">投流汇总</h4>
          <table class="data-table">
            <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr></thead>
            <tbody>
              <tr v-for="(ad, i) in report.douyin_ad_accounts" :key="i">
                <td>{{ ad.account_name }}</td>
                <td>{{ formatNumber(ad.ad_spend) }}</td>
                <td>{{ formatNumber(ad.lead_count) }}</td>
                <td>{{ calcLeadCost(ad.ad_spend, ad.lead_count) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <!-- Module 4: Xiaohongshu -->
      <div class="card" v-if="report.xiaohongshu_accounts?.length || report.xiaohongshu_ad_accounts?.length">
        <div class="card-header">四、小红书精细数据</div>

        <template v-if="report.xiaohongshu_accounts?.length">
          <h4 style="margin:12px 0 8px;font-size:14px;color:var(--color-text-secondary)">各账号数据</h4>
          <table class="data-table">
            <thead><tr><th>账号名</th><th>更新图文数</th><th>自然流线索数</th></tr></thead>
            <tbody>
              <tr v-for="(a, i) in report.xiaohongshu_accounts" :key="i">
                <td>{{ a.account_name }}</td>
                <td>{{ a.posts_updated ?? 0 }}</td>
                <td>{{ a.organic_leads ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="report.xiaohongshu_ad_accounts?.length">
          <h4 style="margin:12px 0 8px;font-size:14px;color:var(--color-text-secondary)">投流汇总</h4>
          <table class="data-table">
            <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th></tr></thead>
            <tbody>
              <tr v-for="(ad, i) in report.xiaohongshu_ad_accounts" :key="i">
                <td>{{ ad.account_name }}</td>
                <td>{{ formatNumber(ad.ad_spend) }}</td>
                <td>{{ formatNumber(ad.lead_count) }}</td>
                <td>{{ calcLeadCost(ad.ad_spend, ad.lead_count) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <!-- Module 5: Other sources -->
      <div class="card" v-if="report.other_sources?.length">
        <div class="card-header">五、其他来源数据</div>
        <table class="data-table">
          <thead><tr><th>来源</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in report.other_sources" :key="i">
              <td>{{ s.source_name }}</td>
              <td>{{ formatNumber(s.ad_spend) }}</td>
              <td>{{ formatNumber(s.lead_count) }}</td>
              <td>{{ calcLeadCost(s.ad_spend, s.lead_count) }}</td>
              <td>{{ formatNumber(s.order_count) }}</td>
              <td>{{ s.lead_count > 0 && s.order_count > 0 ? ((s.order_count / s.lead_count) * 100).toFixed(2) : '0' }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Trend chart -->
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
import PieChart from '@/components/charts/PieChart.vue'
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

// 优先使用 store 实时数据，否则用数据库中的历史数据
const channelData = computed(() => {
  const generated = store.generatedChannelLeads
  if (generated.length > 0) return generated
  return report.value?.channel_leads || []
})

const today = new Date().toLocaleDateString('zh-CN')

// 使用 store 实时计算值（处理新建报告未保存的场景）
const displayTotalLeads = computed(() => {
  const storeVal = store.computedTotalLeads
  if (storeVal > 0) return storeVal
  return report.value?.total_leads || 0
})

const displayTotalAdSpend = computed(() => {
  const storeVal = store.computedTotalAdSpend
  if (storeVal > 0) return storeVal
  return report.value?.total_ad_spend || 0
})

const displayConversionRate = computed(() => {
  const leads = displayTotalLeads.value
  if (!leads) return '0.0'
  const orders = report.value?.total_orders || 0
  return ((orders / leads) * 100).toFixed(1)
})

const totalRevenue = computed(() =>
  (report.value?.online_revenue || 0) + (report.value?.offline_revenue || 0)
)

// 实时计算线索成本
function calcLeadCost(adSpend: number, leadCount: number): string {
  if (leadCount > 0 && adSpend > 0) return (adSpend / leadCount).toFixed(2)
  return '0'
}

function getChannelPercent(count: number): string {
  const total = channelData.value.reduce((s, c) => s + (c.lead_count || 0), 0)
  if (!total) return '0.0'
  return ((count / total) * 100).toFixed(1)
}

async function handleSave() {
  saving.value = true
  const result = await store.save()
  saving.value = false
  if (result.success) {
    alert('保存成功')
  } else {
    alert('保存失败: ' + result.error)
  }
}

async function exportPdf() {
  exporting.value = true
  const result = await ipcService.generatePdf(region.value, props.year, props.month)
  exporting.value = false
  if (result.success) {
    alert('PDF导出成功！')
  } else if (result.error !== '已取消') {
    alert('导出失败: ' + result.error)
  }
}

onMounted(async () => {
  // 优先使用 store 中的数据（编辑页填好后跳转过来）
  if (store.data.region && store.data.year === props.year && store.data.month === props.month) {
    report.value = JSON.parse(JSON.stringify(store.data))
  }
  // 否则从数据库加载
  if (!report.value) {
    const result = await ipcService.getReport(region.value, props.year, props.month)
    if (result && !(result as any).error) {
      report.value = result
    }
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
