<template>
  <div class="page">
    <h1 class="page-title">{{ store.data.region }} — {{ store.data.year }}年{{ store.data.month }}月</h1>

    <div class="steps">
      <div v-for="(s, i) in steps" :key="s.key"
        class="step" :class="{ active: activeStep === i, done: i < activeStep }"
        @click="goToStep(i)">
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="card">

      <!-- ============ Step 1: 账号运营情况 ============ -->
      <div v-show="activeStep === 0">
        <div class="card-header">
          账号运营情况
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addOrganicPlatform()">+ 添加账号平台</button>
        </div>

        <div v-if="store.organicPlatforms.length === 0" style="color:var(--color-text-secondary);padding:12px 0">
          暂无平台，点击"添加账号平台"开始录入
        </div>

        <div v-for="g in store.organicGroups" :key="g.id" style="margin-bottom:16px;border:1px solid var(--color-border);border-radius:8px;padding:12px">
          <div style="margin-bottom:10px">
            <input v-model="g.name" @change="store.syncOrganicName(g.id, g.name)" placeholder="输入平台名称" style="width:100%;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;font-size:15px;font-weight:600" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:13px;color:var(--color-text-secondary)">账号列表</span>
            <button class="btn btn-outline btn-sm" @click="store.addOrganicAccount(g.id, g.name)">+ 添加账号</button>
            <button class="btn btn-danger btn-sm" style="margin-left:auto" @click="store.removeOrganicPlatform(g.id)">删除平台</button>
          </div>
          <table class="data-table" v-if="g.accounts.length > 0">
            <thead><tr><th>账号名</th><th>更新数</th><th>自然流线索数</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(acc, ai) in g.accounts" :key="ai">
                <td><input v-model="acc.account_name" @input="store.markDirty()" placeholder="账号名" /></td>
                <td><input type="number" min="0" v-model.number="acc.content_updated" @input="store.markDirty()" /></td>
                <td><input type="number" min="0" v-model.number="acc.organic_leads" @input="store.markDirty()" /></td>
                <td><button class="btn btn-danger btn-sm" @click="store.removeOrganicAccount(store.data.organic_accounts.indexOf(acc))">删除</button></td>
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
          暂无投流平台，点击"添加投流平台"开始录入
        </div>

        <div v-for="g in store.adGroups" :key="g.id" style="margin-bottom:16px;border:1px solid var(--color-border);border-radius:8px;padding:12px">
          <div style="margin-bottom:10px">
            <input v-model="g.name" @change="store.syncAdName(g.id, g.name)" placeholder="输入平台名称" style="width:100%;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;font-size:15px;font-weight:600" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:13px;color:var(--color-text-secondary)">账号列表</span>
            <button class="btn btn-outline btn-sm" @click="store.addAdAccount(g.id, g.name)">+ 添加账号</button>
            <button class="btn btn-danger btn-sm" style="margin-left:auto" @click="store.removeAdPlatform(g.id)">删除平台</button>
          </div>
          <table class="data-table" v-if="g.accounts.length > 0">
            <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(acc, ai) in g.accounts" :key="ai">
                <td><input v-model="acc.account_name" @input="store.markDirty()" placeholder="投流账号名" /></td>
                <td><input type="number" min="0" step="0.01" v-model.number="acc.ad_spend" @input="store.markDirty()" /></td>
                <td><input type="number" min="0" v-model.number="acc.lead_count" @input="store.markDirty()" /></td>
                <td><input class="form-input" :value="acc.lead_count > 0 && acc.ad_spend > 0 ? (acc.ad_spend / acc.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动" /></td>
                <td><button class="btn btn-danger btn-sm" @click="store.removeAdAccount(store.data.ad_accounts.indexOf(acc))">删除</button></td>
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
        <div class="card-header">订单汇总（自动统计）</div>
        <div class="grid-3" style="margin-bottom:20px">
          <div class="form-group">
            <label class="form-label">订单数量</label>
            <input class="form-input" :value="store.computedTotalOrders.toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
          <div class="form-group">
            <label class="form-label">线上成交金额（元）</label>
            <input class="form-input" :value="store.computedOnlineRevenue.toLocaleString()" disabled style="background:#f1f5f9" />
            <span style="font-size:11px;color:var(--color-text-secondary)">客户来源 ≠ 微信/转介绍</span>
          </div>
          <div class="form-group">
            <label class="form-label">其他渠道成交金额（元）</label>
            <input class="form-input" :value="store.computedOfflineRevenue.toLocaleString()" disabled style="background:#f1f5f9" />
            <span style="font-size:11px;color:var(--color-text-secondary)">客户来源 = 微信/转介绍</span>
          </div>
          <div class="form-group">
            <label class="form-label">总金额（自动计算）</label>
            <input class="form-input" :value="(store.computedOnlineRevenue + store.computedOfflineRevenue).toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
        </div>

        <div class="card-header">
          订单明细
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addOrderEntry()">+ 添加订单</button>
          <button class="btn btn-outline btn-sm" style="margin-left:8px" @click="uploadExcel" :disabled="uploading">{{ uploading ? '读取中...' : '上传订单文件' }}</button>
        </div>
        <div v-if="store.data.order_entries.length > 0" style="overflow-x:auto">
          <table class="data-table" style="min-width:1200px">
            <thead><tr>
              <th>#</th><th>订单创建时间</th><th>订单内容</th><th>订单状态</th><th>订单创建人</th>
              <th>成交次数</th><th>产品名称</th><th>客户信息</th><th>联系方式</th><th>客户来源</th><th>订单金额</th><th>操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="(o, i) in store.data.order_entries" :key="i">
                <td style="color:var(--color-text-secondary);width:30px">{{ i + 1 }}</td>
                <td><input v-model="o.order_time" @input="store.markDirty()" style="width:120px" placeholder="2026-04-01" /></td>
                <td><input v-model="o.order_content" @input="store.markDirty()" style="width:100px" /></td>
                <td><input v-model="o.order_status" @input="store.markDirty()" style="width:60px" /></td>
                <td><input v-model="o.order_creator" @input="store.markDirty()" style="width:60px" /></td>
                <td><input v-model="o.deal_count" @input="store.markDirty()" style="width:60px" /></td>
                <td><input v-model="o.product_name" @input="store.markDirty()" style="width:80px" /></td>
                <td><input v-model="o.customer_info" @input="store.markDirty()" style="width:80px" /></td>
                <td><input v-model="o.contact_info" @input="store.markDirty()" style="width:80px" /></td>
                <td><input v-model="o.customer_source" @input="store.markDirty()" style="width:60px" /></td>
                <td><input type="number" min="0" step="0.01" v-model.number="o.order_amount" @input="store.markDirty()" style="width:80px" /></td>
                <td><button class="btn btn-danger btn-sm" @click="store.removeOrderEntry(i)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无订单数据，点击"添加订单"开始录入</div>
      </div>

      <!-- Navigation -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
        <button v-if="activeStep > 0" class="btn btn-outline" @click="activeStep--">上一步</button>
        <span v-else></span>
        <button v-if="activeStep < 3" class="btn btn-primary" @click="nextStep">下一步</button>
        <button v-else class="btn btn-success" @click="goToPreview">预览报告</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReportStore } from '@/stores/reportStore'
import { ipcService } from '@/services/ipcService'

const route = useRoute()
const router = useRouter()
const store = useReportStore()
const uploading = ref(false)

const props = defineProps<{ year: number; month: number }>()

function sortCurrentStep() {
  if (activeStep.value === 0) {
    // 步骤1：按更新数排序
    store.data.organic_accounts.sort((a, b) => (b.content_updated || 0) - (a.content_updated || 0))
  } else if (activeStep.value === 1) {
    // 步骤2：按消耗金额排序
    store.data.ad_accounts.sort((a, b) => (b.ad_spend || 0) - (a.ad_spend || 0))
  } else if (activeStep.value === 2) {
    // 步骤3：按线索数排序
    store.data.other_channels.sort((a, b) => (b.lead_count || 0) - (a.lead_count || 0))
  }
}

function goToStep(i: number) {
  sortCurrentStep()
  activeStep.value = i
}

function nextStep() {
  sortCurrentStep()
  activeStep.value++
}

const activeStep = ref(0)
const steps = [
  { key: 'organic', label: '账号运营情况' },
  { key: 'ad', label: '投流情况' },
  { key: 'other', label: '其他渠道情况' },
  { key: 'order', label: '订单情况' }
]

async function uploadExcel() {
  uploading.value = true
  const result = await ipcService.openExcelFile()
  uploading.value = false
  if (result.success && result.entries) {
    for (const e of result.entries) {
      store.data.order_entries.push({
        order_time: e.order_time || '',
        order_content: e.order_content || '',
        order_status: e.order_status || '',
        order_creator: e.order_creator || '',
        deal_count: e.deal_count || '',
        product_name: e.product_name || '',
        customer_info: e.customer_info || '',
        contact_info: e.contact_info || '',
        customer_source: e.customer_source || '',
        order_amount: e.order_amount || 0
      })
    }
    store.markDirty()
  } else if (result.error !== '已取消') {
    alert('读取失败: ' + result.error)
  }
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
