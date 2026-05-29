<template>
  <div class="page">
    <h1 class="page-title">历史数据</h1>

    <div v-if="reports.length === 0" class="card" style="text-align:center;padding:40px;color:var(--color-text-secondary)">
      暂无历史报告数据
    </div>

    <div v-else class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>地区</th>
            <th>月份</th>
            <th>新线索总计</th>
            <th>总订单数</th>
            <th>总成交金额</th>
            <th>总成交率</th>
            <th>总投流消耗</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td><strong>{{ r.region || '-' }}</strong></td>
            <td>{{ r.year }}年{{ r.month }}月</td>
            <td>{{ r.total_leads.toLocaleString() }}</td>
            <td>{{ r.total_orders.toLocaleString() }}</td>
            <td>{{ ((r.online_revenue || 0) + (r.offline_revenue || 0)).toLocaleString() }} 元</td>
            <td>{{ calcRate(r.total_orders, r.total_leads) }}%</td>
            <td>{{ r.total_ad_spend.toLocaleString() }} 元</td>
            <td style="font-size:12px;color:var(--color-text-secondary)">{{ formatDate(r.updated_at) }}</td>
            <td>
              <button class="btn btn-outline btn-sm" @click="router.push(`/report/${r.year}/${r.month}?region=${encodeURIComponent(r.region || '')}`)">编辑</button>
              <button class="btn btn-outline btn-sm" style="margin-left:4px" @click="router.push(`/report/${r.year}/${r.month}/preview?region=${encodeURIComponent(r.region || '')}`)">预览</button>
              <button class="btn btn-danger btn-sm" style="margin-left:4px" @click="confirmDelete(r)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <h3 style="margin-bottom:12px">确认删除</h3>
        <p style="margin-bottom:16px;color:var(--color-text-secondary)">确定要删除 <strong>{{ deleteTarget.year }}年{{ deleteTarget.month }}月</strong> 的报告数据吗？此操作不可恢复。</p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline" @click="deleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="handleDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ipcService } from '@/services/ipcService'
import type { ReportSummary } from '@/types'

const router = useRouter()
const reports = ref<ReportSummary[]>([])
const deleteTarget = ref<ReportSummary | null>(null)

function calcRate(orders: number, leads: number): string {
  if (!leads) return '0.0'
  return ((orders / leads) * 100).toFixed(1)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dateStr.replace('T', ' ').substring(0, 16)
}

function confirmDelete(r: ReportSummary) {
  deleteTarget.value = r
}

async function handleDelete() {
  if (!deleteTarget.value) return
  const result = await ipcService.deleteReport(
    deleteTarget.value.region || '',
    deleteTarget.value.year,
    deleteTarget.value.month
  )
  if (result.success) {
    reports.value = reports.value.filter(r => r.id !== deleteTarget.value!.id)
  } else {
    alert('删除失败: ' + result.error)
  }
  deleteTarget.value = null
}

onMounted(async () => {
  reports.value = await ipcService.listReports()
})
</script>
