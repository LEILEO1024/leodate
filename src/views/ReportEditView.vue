<template>
  <div class="page">
    <h1 class="page-title">{{ store.data.region }} — {{ store.data.year }}年{{ store.data.month }}月</h1>

    <div class="steps">
      <div v-for="(s, i) in steps" :key="s.key"
        class="step" :class="{ active: activeStep === i, done: i < activeStep }"
        @click="activeStep = i">
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="card">

      <!-- ============ Step 1: 账号运营情况 ============ -->
      <div v-show="activeStep === 0">
        <div class="card-header">
          账号运营情况
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addOrganicPlatform()">+ 添加平台</button>
        </div>

        <div v-if="store.organicPlatforms.length === 0" style="color:var(--color-text-secondary);padding:12px 0">
          暂无账号，点击"添加平台"开始录入
        </div>

        <div v-for="(plat, pi) in store.organicPlatforms" :key="pi" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <input v-model="plat.accounts[0].platform_name" @input="store.markDirty()" placeholder="输入平台名称" style="flex:1;max-width:260px;padding:6px 10px;border:1px solid var(--color-border);border-radius:6px;font-size:14px;font-weight:600" />
            <button class="btn btn-outline btn-sm" @click="addAccountToPlatform(plat.name || '')">+ 添加账号</button>
            <button class="btn btn-danger btn-sm" @click="removePlatform(pi, 'organic')">删除平台</button>
          </div>
          <table class="data-table">
            <thead><tr><th>账号名</th><th>更新数</th><th>自然流线索数</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(acc, ai) in plat.accounts" :key="ai">
                <td><input v-model="acc.account_name" @input="syncPlatformName(pi, ai, 'organic')" placeholder="账号名" /></td>
                <td><input type="number" min="0" v-model.number="acc.content_updated" @input="store.markDirty()" /></td>
                <td><input type="number" min="0" v-model.number="acc.organic_leads" @input="store.markDirty()" /></td>
                <td><button class="btn btn-danger btn-sm" @click="removeAccount(pi, ai, 'organic')">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ Step 2: 投流情况 ============ -->
      <div v-show="activeStep === 1">
        <div class="card-header">
          投流情况
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addAdPlatform()">+ 添加投流平台</button>
        </div>

        <div v-if="store.adPlatforms.length === 0" style="color:var(--color-text-secondary);padding:12px 0">
          暂无投流数据，点击"添加投流平台"开始录入
        </div>

        <div v-for="(plat, pi) in store.adPlatforms" :key="pi" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <input v-model="plat.accounts[0].platform_name" @input="store.markDirty()" placeholder="输入平台名称" style="flex:1;max-width:260px;padding:6px 10px;border:1px solid var(--color-border);border-radius:6px;font-size:14px;font-weight:600" />
            <button class="btn btn-outline btn-sm" @click="addAccountToPlatform(plat.name || '')">+ 添加账号</button>
            <button class="btn btn-danger btn-sm" @click="removePlatform(pi, 'ad')">删除平台</button>
          </div>
          <table class="data-table">
            <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(acc, ai) in plat.accounts" :key="ai">
                <td><input v-model="acc.account_name" @input="syncPlatformName(pi, ai, 'ad')" placeholder="投流账号名" /></td>
                <td><input type="number" min="0" step="0.01" v-model.number="acc.ad_spend" @input="store.markDirty()" /></td>
                <td><input type="number" min="0" v-model.number="acc.lead_count" @input="store.markDirty()" /></td>
                <td><input class="form-input" :value="acc.lead_count > 0 && acc.ad_spend > 0 ? (acc.ad_spend / acc.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动" /></td>
                <td><button class="btn btn-danger btn-sm" @click="removeAccount(pi, ai, 'ad')">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ Step 3: 其他渠道情况 ============ -->
      <div v-show="activeStep === 2">
        <div class="card-header">
          其他渠道情况
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addOtherChannel()">+ 添加渠道</button>
        </div>

        <table class="data-table" v-if="store.data.other_channels.length > 0">
          <thead><tr><th>渠道名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率（%）</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in store.data.other_channels" :key="i">
              <td><input v-model="c.channel_name" @input="store.markDirty()" placeholder="渠道名" /></td>
              <td><input type="number" min="0" step="0.01" v-model.number="c.ad_spend" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="c.lead_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="c.lead_count > 0 && c.ad_spend > 0 ? (c.ad_spend / c.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动" /></td>
              <td><input type="number" min="0" v-model.number="c.order_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="c.lead_count > 0 && c.order_count > 0 ? ((c.order_count / c.lead_count) * 100).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeOtherChannel(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无渠道，点击"添加渠道"开始录入</div>
      </div>

      <!-- ============ Step 4: 订单情况 ============ -->
      <div v-show="activeStep === 3">
        <div class="card-header">订单情况</div>
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">订单数量</label>
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
          <div class="form-group">
            <label class="form-label">总金额（自动计算）</label>
            <input class="form-input" :value="((store.data.online_revenue || 0) + (store.data.offline_revenue || 0)).toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
        <button v-if="activeStep > 0" class="btn btn-outline" @click="activeStep--">上一步</button>
        <span v-else></span>
        <button v-if="activeStep < 3" class="btn btn-primary" @click="activeStep++">下一步</button>
        <button v-else class="btn btn-success" @click="goToPreview">预览报告</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReportStore } from '@/stores/reportStore'

const route = useRoute()
const router = useRouter()
const store = useReportStore()

const props = defineProps<{ year: number; month: number }>()

const activeStep = ref(0)
const steps = [
  { key: 'organic', label: '账号运营情况' },
  { key: 'ad', label: '投流情况' },
  { key: 'other', label: '其他渠道情况' },
  { key: 'order', label: '订单情况' }
]

// Add a new account to an existing platform
function addAccountToPlatform(platformName: string) {
  // Find which platform group and add a new account with the same platform_name
  if (activeStep.value === 0) {
    store.data.organic_accounts.push({ platform_name: platformName, account_name: '', content_updated: 0, organic_leads: 0 })
    store.markDirty()
  } else if (activeStep.value === 1) {
    store.data.ad_accounts.push({ platform_name: platformName, account_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0 })
    store.markDirty()
  }
}

// Sync platform_name across all accounts in the same group
function syncPlatformName(pi: number, ai: number, type: 'organic' | 'ad') {
  if (activeStep.value === 0) {
    const plat = store.organicPlatforms[pi]
    if (plat && ai === 0) {
      for (let i = 1; i < plat.accounts.length; i++) {
        plat.accounts[i].platform_name = plat.accounts[0].platform_name
      }
    }
  } else {
    const plat = store.adPlatforms[pi]
    if (plat && ai === 0) {
      for (let i = 1; i < plat.accounts.length; i++) {
        plat.accounts[i].platform_name = plat.accounts[0].platform_name
      }
    }
  }
  store.markDirty()
}

function removePlatform(pi: number, type: 'organic' | 'ad') {
  if (type === 'organic') {
    const plat = store.organicPlatforms[pi]
    if (plat) {
      const indices: number[] = []
      store.data.organic_accounts.forEach((a, i) => {
        if (a.platform_name === plat.name || (a.platform_name === '' && plat.accounts.some(pa => pa === a))) {
          indices.push(i)
        }
      })
      indices.reverse().forEach(i => store.data.organic_accounts.splice(i, 1))
    }
  } else {
    const plat = store.adPlatforms[pi]
    if (plat) {
      const indices: number[] = []
      store.data.ad_accounts.forEach((a, i) => {
        if (a.platform_name === plat.name || (a.platform_name === '' && plat.accounts.some(pa => pa === a))) {
          indices.push(i)
        }
      })
      indices.reverse().forEach(i => store.data.ad_accounts.splice(i, 1))
    }
  }
  store.markDirty()
}

function removeAccount(pi: number, ai: number, type: 'organic' | 'ad') {
  if (type === 'organic') {
    const plat = store.organicPlatforms[pi]
    if (plat && plat.accounts.length <= 1) {
      removePlatform(pi, 'organic')
      return
    }
    const acc = plat?.accounts[ai]
    if (acc) {
      const idx = store.data.organic_accounts.indexOf(acc)
      if (idx >= 0) store.data.organic_accounts.splice(idx, 1)
    }
  } else {
    const plat = store.adPlatforms[pi]
    if (plat && plat.accounts.length <= 1) {
      removePlatform(pi, 'ad')
      return
    }
    const acc = plat?.accounts[ai]
    if (acc) {
      const idx = store.data.ad_accounts.indexOf(acc)
      if (idx >= 0) store.data.ad_accounts.splice(idx, 1)
    }
  }
  store.markDirty()
}

function goToPreview() {
  const reg = (route.query.region as string) || store.data.region || ''
  router.push(`/report/${store.data.year}/${store.data.month}/preview?region=${encodeURIComponent(reg)}&step=${activeStep.value}`)
}

onMounted(async () => {
  const reg = (route.query.region as string) || ''
  const step = Number(route.query.step)
  if (!isNaN(step)) activeStep.value = step
  // 如果 store 已有同报告数据则保留，不重新加载
  if (store.data.region === reg && store.data.year === props.year && store.data.month === props.month) return
  await store.load(reg, props.year, props.month)
})
</script>
