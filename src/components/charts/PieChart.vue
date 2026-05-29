<template>
  <div v-if="hasData" style="max-width:400px;margin:20px auto 0">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps<{
  channelData: { name: string; value: number }[]
  title: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
const hasData = ref(false)
let chart: Chart | null = null

const COLORS = ['#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e74c3c','#f39c12','#2980b9','#27ae60','#8e44ad']

function renderChart() {
  if (!canvasRef.value || props.channelData.length === 0) {
    hasData.value = false
    return
  }
  const total = props.channelData.reduce((s, c) => s + c.value, 0)
  if (total === 0) { hasData.value = false; return }
  hasData.value = true

  if (chart) chart.destroy()

  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: props.channelData.map(c => c.name),
      datasets: [{
        data: props.channelData.map(c => c.value),
        backgroundColor: COLORS.slice(0, props.channelData.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = total > 0 ? ((ctx.raw as number) / total * 100).toFixed(1) : '0'
              return `${ctx.label}: ${(ctx.raw as number).toLocaleString()} (${pct}%)`
            }
          }
        }
      }
    }
  })
}

onMounted(() => { renderChart() })
watch(() => props.channelData, () => { renderChart() }, { deep: true })
</script>
