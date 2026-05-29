<template>
  <div v-if="hasData" class="card">
    <div class="card-header">{{ title }}</div>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import type { ReportSummary } from '@/types'

Chart.register(...registerables)

const props = defineProps<{
  reports: ReportSummary[]
  title: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
const hasData = ref(false)
let chart: Chart | null = null

function renderChart() {
  if (!canvasRef.value || props.reports.length === 0) {
    hasData.value = false
    return
  }
  hasData.value = true

  if (chart) chart.destroy()

  const labels = props.reports.map(r => `${r.year}/${r.month}`)
  const leads = props.reports.map(r => r.total_leads)
  const orders = props.reports.map(r => r.total_orders)
  const revenues = props.reports.map(r => (r.online_revenue || 0) + (r.offline_revenue || 0))

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '新线索总计',
          data: leads,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52,152,219,0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '总订单数',
          data: orders,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '总成交金额（万元）',
          data: revenues.map(v => Math.round(v / 100) / 100),
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230,126,34,0.1)',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { title: { display: true, text: '数量' }, beginAtZero: true },
        y1: {
          position: 'right',
          title: { display: true, text: '万元' },
          beginAtZero: true,
          grid: { drawOnChartArea: false }
        }
      }
    }
  })
}

onMounted(() => { renderChart() })
watch(() => props.reports, () => { renderChart() }, { deep: true })
</script>
