<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h1 class="page-title" style="margin-bottom:0">{{ store.data.region }} — {{ store.data.year }}年{{ store.data.month }}月</h1>
      <button
        class="btn btn-outline"
        :disabled="!saved"
        @click="router.push(`/report/${store.data.year}/${store.data.month}/preview?region=${encodeURIComponent(region)}`)"
      >预览报告</button>
    </div>

    <!-- Step indicator -->
    <div class="steps">
      <div v-for="(s, i) in steps" :key="s.key"
        class="step" :class="{ active: activeStep === i, done: i < activeStep }"
        @click="goToStep(i)">
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <!-- Step content -->
    <div class="card">
      <!-- Step 0: Core metrics -->
      <div v-show="activeStep === 0">
        <div class="card-header">核心指标</div>
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">新线索总计（自动汇总）</label>
            <input class="form-input" :value="store.computedTotalLeads.toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
          <div class="form-group">
            <label class="form-label">总成交率（自动计算）</label>
            <input class="form-input" :value="store.computedConversionRate + '%'" disabled style="background:#f1f5f9" />
          </div>
          <div class="form-group">
            <label class="form-label">总投流消耗（自动汇总）</label>
            <input class="form-input" :value="store.computedTotalAdSpend.toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
          <div class="form-group">
            <label class="form-label">总订单数</label>
            <input class="form-input" type="number" min="0" v-model.number="store.data.total_orders" @input="store.markDirty()" />
          </div>
          <div class="form-group">
            <label class="form-label">线上成交金额（元）</label>
            <input class="form-input" type="number" min="0" step="0.01" v-model.number="store.data.online_revenue" @input="store.markDirty()" />
          </div>
          <div class="form-group">
            <label class="form-label">其他渠道成交金额（元）</label>
            <input class="form-input" type="number" min="0" step="0.01" v-model.number="store.data.offline_revenue" @input="store.markDirty()" />
          </div>
        </div>
      </div>

      <!-- Step 1: Channel leads -->
      <div v-show="activeStep === 1">
        <div class="card-header">
          线索渠道来源
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addChannelLead()">+ 添加渠道</button>
        </div>
        <table class="data-table" v-if="sortedChannels.length > 0">
          <thead><tr><th>#</th><th>渠道名称</th><th>线索数</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(ch, i) in sortedChannels" :key="i">
              <td style="color:var(--color-text-secondary);width:30px">{{ i + 1 }}</td>
              <td><input v-model="ch.channel_name" @input="store.markDirty()" placeholder="输入渠道名称" /></td>
              <td><input type="number" min="0" v-model.number="ch.lead_count" @input="onChannelChange()" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeChannelLead(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无渠道，点击"添加渠道"开始录入</div>
      </div>

      <!-- Step 2: Deal sources -->
      <div v-show="activeStep === 2">
        <div class="card-header">
          成交来源数据
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addDealSource()">+ 添加来源</button>
        </div>
        <table class="data-table" v-if="store.data.deal_sources.length > 0">
          <thead><tr><th>来源名称</th><th>成交数</th><th>成交金额（元）</th><th>成交率（%）</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in store.data.deal_sources" :key="i">
              <td><input v-model="s.source_name" @input="store.markDirty()" placeholder="输入来源名称" /></td>
              <td><input type="number" min="0" v-model.number="s.order_count" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" step="0.01" v-model.number="s.revenue" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" max="100" step="0.1" v-model.number="s.conversion_rate" @input="store.markDirty()" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeDealSource(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无来源，点击"添加来源"开始录入</div>
      </div>

      <!-- Navigation -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
        <button v-if="activeStep > 0" class="btn btn-outline" @click="prevStep">上一步</button>
        <span v-else></span>
        <div style="display:flex;gap:8px">
          <button v-if="activeStep < 2" class="btn btn-primary" @click="nextStep">下一步</button>
          <button v-else class="btn btn-success" @click="handleSave" :disabled="saving">
            {{ saving ? '保存中...' : '保存数据' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast" :class="'toast-' + toastType">{{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReportStore } from '@/stores/reportStore'

const route = useRoute()
const router = useRouter()
const store = useReportStore()

const props = defineProps<{ year: number; month: number }>()
const region = computed(() => (route.query.region as string) || store.data.region || '')

const activeStep = ref(0)
const toast = ref('')
const toastType = ref('success')
const saved = ref(false)
const saving = ref(false)

const steps = [
  { key: 'core', label: '核心指标' },
  { key: 'channel', label: '线索渠道来源' },
  { key: 'deal', label: '成交来源数据' }
]

const sortedChannels = computed(() =>
  [...store.data.channel_leads].sort((a, b) => (b.lead_count || 0) - (a.lead_count || 0))
)

function onChannelChange() {
  store.sortChannels()
  store.markDirty()
}

function goToStep(i: number) {
  if (i <= activeStep.value) activeStep.value = i
}
function prevStep() { if (activeStep.value > 0) activeStep.value-- }
function nextStep() { activeStep.value++ }

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = msg
  toastType.value = type
  setTimeout(() => { toast.value = '' }, type === 'error' ? 8000 : 2500)
}

async function handleSave() {
  saving.value = true
  const result = await store.save()
  saving.value = false
  if (result.success) {
    saved.value = true
    showToast('保存成功')
  } else {
    showToast('保存失败: ' + result.error, 'error')
  }
}

onMounted(async () => {
  await store.load(region.value, props.year, props.month)
  if (store.isLoaded) saved.value = true
})
</script>
