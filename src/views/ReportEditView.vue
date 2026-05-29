<template>
  <div class="page">
    <h1 class="page-title">{{ store.data.region }} — {{ store.data.year }}年{{ store.data.month }}月</h1>

    <!-- Step indicator -->
    <div class="steps">
      <div v-for="(s, i) in steps" :key="s.key"
        class="step" :class="{ active: activeStep === i, done: i < activeStep }"
        @click="activeStep = i">
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <!-- ==================== Step Content ==================== -->
    <div class="card">

      <!-- Step 1: 核心指标 -->
      <div v-show="activeStep === 0">
        <div class="card-header">核心指标（汇总层）</div>
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
            <label class="form-label">总投流消耗金额（自动汇总）</label>
            <input class="form-input" :value="store.computedTotalAdSpend.toLocaleString()" disabled style="background:#f1f5f9" />
          </div>
          <div class="form-group">
            <label class="form-label">总订单数</label>
            <input class="form-input" type="number" min="0" v-model.number="store.data.total_orders" @input="store.markDirty()" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">线上成交金额（元）</label>
            <input class="form-input" type="number" min="0" step="0.01" v-model.number="store.data.online_revenue" @input="store.markDirty()" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">其他渠道成交金额（元）</label>
            <input class="form-input" type="number" min="0" step="0.01" v-model.number="store.data.offline_revenue" @input="store.markDirty()" placeholder="0" />
          </div>
        </div>
      </div>

      <!-- Step 2: 抖音精细数据 -->
      <div v-show="activeStep === 1">
        <!-- 自然流账号 -->
        <div class="card-header">
          抖音各账号数据
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addDouyinAccount()">+ 添加账号</button>
        </div>
        <table class="data-table" v-if="store.data.douyin_accounts.length > 0">
          <thead><tr><th>账号名</th><th>更新视频数</th><th>自然流线索数</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(acc, i) in store.data.douyin_accounts" :key="i">
              <td><input v-model="acc.account_name" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="acc.videos_updated" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="acc.organic_leads" @input="store.markDirty()" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeDouyinAccount(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无账号，点击"添加账号"开始录入</div>

        <!-- 投流汇总 -->
        <div class="card-header" style="margin-top:20px">
          投流汇总
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addDouyinAdAccount()">+ 添加投流</button>
        </div>
        <table class="data-table" v-if="store.data.douyin_ad_accounts.length > 0">
          <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(ad, i) in store.data.douyin_ad_accounts" :key="i">
              <td><input v-model="ad.account_name" @input="store.markDirty()" placeholder="投流账号名" /></td>
              <td><input type="number" min="0" step="0.01" v-model.number="ad.ad_spend" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="ad.lead_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="ad.lead_count > 0 && ad.ad_spend > 0 ? (ad.ad_spend / ad.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动计算" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeDouyinAdAccount(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无投流数据，点击"添加投流"开始录入</div>
      </div>

      <!-- Step 3: 小红书精细数据 -->
      <div v-show="activeStep === 2">
        <!-- 自然流账号 -->
        <div class="card-header">
          小红书各账号数据
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addXiaohongshuAccount()">+ 添加账号</button>
        </div>
        <table class="data-table" v-if="store.data.xiaohongshu_accounts.length > 0">
          <thead><tr><th>账号名</th><th>更新图文数</th><th>自然流线索数</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(acc, i) in store.data.xiaohongshu_accounts" :key="i">
              <td><input v-model="acc.account_name" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="acc.posts_updated" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="acc.organic_leads" @input="store.markDirty()" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeXiaohongshuAccount(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无账号，点击"添加账号"开始录入</div>

        <!-- 投流汇总 -->
        <div class="card-header" style="margin-top:20px">
          投流汇总
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addXiaohongshuAdAccount()">+ 添加投流</button>
        </div>
        <table class="data-table" v-if="store.data.xiaohongshu_ad_accounts.length > 0">
          <thead><tr><th>投流账号名</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(ad, i) in store.data.xiaohongshu_ad_accounts" :key="i">
              <td><input v-model="ad.account_name" @input="store.markDirty()" placeholder="投流账号名" /></td>
              <td><input type="number" min="0" step="0.01" v-model.number="ad.ad_spend" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="ad.lead_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="ad.lead_count > 0 && ad.ad_spend > 0 ? (ad.ad_spend / ad.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动计算" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeXiaohongshuAdAccount(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无投流数据，点击"添加投流"开始录入</div>
      </div>

      <!-- Step 4: 其他来源数据 -->
      <div v-show="activeStep === 3">
        <div class="card-header">
          其他来源数据
          <button class="btn btn-outline btn-sm" style="margin-left:12px" @click="store.addOtherSource()">+ 添加来源</button>
        </div>
        <table class="data-table" v-if="store.data.other_sources.length > 0">
          <thead><tr><th>来源名称</th><th>消耗金额（元）</th><th>线索数</th><th>线索成本（元）</th><th>成交数</th><th>成交率（%）</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in store.data.other_sources" :key="i">
              <td><input v-model="s.source_name" @input="store.markDirty()" placeholder="输入来源名称" /></td>
              <td><input type="number" min="0" step="0.01" v-model.number="s.ad_spend" @input="store.markDirty()" /></td>
              <td><input type="number" min="0" v-model.number="s.lead_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="s.lead_count > 0 && s.ad_spend > 0 ? (s.ad_spend / s.lead_count).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动计算" /></td>
              <td><input type="number" min="0" v-model.number="s.order_count" @input="store.markDirty()" /></td>
              <td><input class="form-input" :value="s.lead_count > 0 && s.order_count > 0 ? ((s.order_count / s.lead_count) * 100).toFixed(2) : ''" disabled style="background:#f1f5f9" placeholder="自动计算" /></td>
              <td><button class="btn btn-danger btn-sm" @click="store.removeOtherSource(i)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="color:var(--color-text-secondary);padding:12px 0">暂无来源，点击"添加来源"开始录入</div>
      </div>

      <!-- Navigation buttons -->
      <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
        <button v-if="activeStep > 0" class="btn btn-outline" @click="prevStep">上一步</button>
        <span v-else></span>
        <div style="display:flex;gap:8px">
          <button v-if="activeStep < 3" class="btn btn-primary" @click="nextStep">下一步</button>
          <button v-else class="btn btn-success" @click="goToPreview">预览报告</button>
        </div>
      </div>
    </div>

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

const steps = [
  { key: 'core', label: '核心指标' },
  { key: 'douyin', label: '抖音精细数据' },
  { key: 'xhs', label: '小红书精细数据' },
  { key: 'other', label: '其他来源数据' }
]

function prevStep() { if (activeStep.value > 0) activeStep.value-- }
function nextStep() {
  activeStep.value++
}
function goToPreview() {
  router.push(`/report/${store.data.year}/${store.data.month}/preview?region=${encodeURIComponent(region.value)}`)
}

onMounted(async () => {
  await store.load(region.value, props.year, props.month)
})
</script>
