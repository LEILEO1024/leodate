import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ReportData, ChannelLead,
  DouyinAccount, DouyinAdAccount,
  XiaohongshuAccount, XiaohongshuAdAccount,
  OtherSource
} from '@/types'
import { ipcService } from '@/services/ipcService'

function emptyReport(region: string, year: number, month: number): ReportData {
  return {
    region, year, month,
    total_leads: 0, total_orders: 0,
    online_revenue: 0, offline_revenue: 0,
    total_ad_spend: 0,
    channel_leads: [],
    douyin_accounts: [],
    douyin_ad_accounts: [],
    xiaohongshu_accounts: [],
    xiaohongshu_ad_accounts: [],
    other_sources: []
  }
}

export const useReportStore = defineStore('report', () => {
  const data = ref<ReportData>(emptyReport('', new Date().getFullYear(), new Date().getMonth() + 1))
  const isLoaded = ref(false)
  const isDirty = ref(false)

  // ---- Auto-computed totals across all 5 modules ----

  const computedTotalLeads = computed(() => {
    let total = 0
    // Module 2: channel leads
    total += data.value.channel_leads.reduce((s, c) => s + (c.lead_count || 0), 0)
    // Module 3: douyin organic + ad
    total += data.value.douyin_accounts.reduce((s, a) => s + (a.organic_leads || 0), 0)
    total += data.value.douyin_ad_accounts.reduce((s, a) => s + (a.lead_count || 0), 0)
    // Module 4: xiaohongshu organic + ad
    total += data.value.xiaohongshu_accounts.reduce((s, a) => s + (a.organic_leads || 0), 0)
    total += data.value.xiaohongshu_ad_accounts.reduce((s, a) => s + (a.lead_count || 0), 0)
    // Module 5: other sources
    total += data.value.other_sources.reduce((s, o) => s + (o.lead_count || 0), 0)
    return total
  })

  const computedTotalAdSpend = computed(() => {
    let total = 0
    total += data.value.douyin_ad_accounts.reduce((s, a) => s + (a.ad_spend || 0), 0)
    total += data.value.xiaohongshu_ad_accounts.reduce((s, a) => s + (a.ad_spend || 0), 0)
    total += data.value.other_sources.reduce((s, o) => s + (o.lead_cost || 0), 0)
    return total
  })

  const computedConversionRate = computed(() => {
    if (!data.value.total_leads) return 0
    return Math.round((data.value.total_orders / data.value.total_leads) * 10000) / 100
  })

  // ---- Init / Load / Save ----

  function initNew(region: string, year: number, month: number) {
    data.value = emptyReport(region, year, month)
    isLoaded.value = false
    isDirty.value = false
  }

  async function load(region: string, year: number, month: number) {
    const existing = await ipcService.getReport(region, year, month)
    if (existing && !(existing as any).error) {
      data.value = existing
      isLoaded.value = true
    } else {
      data.value = emptyReport(region, year, month)
      isLoaded.value = false
    }
    isDirty.value = false
  }

  async function save(): Promise<{ success: boolean; error?: string }> {
    try {
      const clean = JSON.parse(JSON.stringify(data.value))

      // Filter empty-name entries & sort channels
      clean.channel_leads = (clean.channel_leads || []).filter((c: any) => c.channel_name?.trim())
      clean.channel_leads.sort((a: any, b: any) => (b.lead_count || 0) - (a.lead_count || 0))
      clean.douyin_accounts = (clean.douyin_accounts || []).filter((a: any) => a.account_name?.trim())
      clean.douyin_ad_accounts = (clean.douyin_ad_accounts || []).filter((a: any) => a.account_name?.trim())
      clean.xiaohongshu_accounts = (clean.xiaohongshu_accounts || []).filter((a: any) => a.account_name?.trim())
      clean.xiaohongshu_ad_accounts = (clean.xiaohongshu_ad_accounts || []).filter((a: any) => a.account_name?.trim())
      clean.other_sources = (clean.other_sources || []).filter((s: any) => s.source_name?.trim())

      // Auto-calculate 抖音投流线索成本 = 消耗金额 ÷ 线索数
      for (const ad of clean.douyin_ad_accounts) {
        if (ad.lead_count > 0 && ad.ad_spend > 0) ad.lead_cost = Math.round((ad.ad_spend / ad.lead_count) * 100) / 100
      }

      // Auto-calculate 小红书投流线索成本 = 消耗金额 ÷ 线索数
      for (const ad of clean.xiaohongshu_ad_accounts) {
        if (ad.lead_count > 0 && ad.ad_spend > 0) ad.lead_cost = Math.round((ad.ad_spend / ad.lead_count) * 100) / 100
      }

      // Auto-calculate 其他来源成交率 = 成交数 ÷ 线索数 × 100
      for (const os of clean.other_sources) {
        if (os.lead_count > 0 && os.order_count > 0) os.conversion_rate = Math.round((os.order_count / os.lead_count) * 10000) / 100
      }

      // Sync computed values
      clean.total_leads = computedTotalLeads.value
      clean.total_ad_spend = computedTotalAdSpend.value

      const result = await ipcService.saveReport(clean)
      if (result.success) {
        data.value.channel_leads = clean.channel_leads
        data.value.douyin_accounts = clean.douyin_accounts
        data.value.douyin_ad_accounts = clean.douyin_ad_accounts
        data.value.xiaohongshu_accounts = clean.xiaohongshu_accounts
        data.value.xiaohongshu_ad_accounts = clean.xiaohongshu_ad_accounts
        data.value.other_sources = clean.other_sources
        data.value.total_leads = clean.total_leads
        data.value.total_ad_spend = clean.total_ad_spend
        isDirty.value = false
        isLoaded.value = true
        return { success: true }
      }
      return { success: false, error: result.error || '未知错误' }
    } catch (e: any) {
      return { success: false, error: e.message || String(e) }
    }
  }

  function markDirty() { isDirty.value = true }

  // ---- Module 2: Channel leads ----
  function addChannelLead() {
    data.value.channel_leads.push({ channel_name: '', lead_count: 0 })
    markDirty()
  }
  function removeChannelLead(index: number) {
    data.value.channel_leads.splice(index, 1)
    markDirty()
  }
  function sortChannels() {
    data.value.channel_leads.sort((a, b) => (b.lead_count || 0) - (a.lead_count || 0))
  }

  // ---- Module 3: Douyin organic accounts ----
  function addDouyinAccount() {
    data.value.douyin_accounts.push({ account_name: `抖音账号${data.value.douyin_accounts.length + 1}`, videos_updated: 0, organic_leads: 0 })
    markDirty()
  }
  function removeDouyinAccount(index: number) {
    data.value.douyin_accounts.splice(index, 1)
    markDirty()
  }

  // ---- Module 3: Douyin ad accounts ----
  function addDouyinAdAccount() {
    data.value.douyin_ad_accounts.push({ account_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0 })
    markDirty()
  }
  function removeDouyinAdAccount(index: number) {
    data.value.douyin_ad_accounts.splice(index, 1)
    markDirty()
  }

  // ---- Module 4: Xiaohongshu organic accounts ----
  function addXiaohongshuAccount() {
    data.value.xiaohongshu_accounts.push({ account_name: `小红书账号${data.value.xiaohongshu_accounts.length + 1}`, posts_updated: 0, organic_leads: 0 })
    markDirty()
  }
  function removeXiaohongshuAccount(index: number) {
    data.value.xiaohongshu_accounts.splice(index, 1)
    markDirty()
  }

  // ---- Module 4: Xiaohongshu ad accounts ----
  function addXiaohongshuAdAccount() {
    data.value.xiaohongshu_ad_accounts.push({ account_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0 })
    markDirty()
  }
  function removeXiaohongshuAdAccount(index: number) {
    data.value.xiaohongshu_ad_accounts.splice(index, 1)
    markDirty()
  }

  // ---- Module 5: Other sources ----
  function addOtherSource() {
    data.value.other_sources.push({ source_name: '', lead_count: 0, lead_cost: 0, order_count: 0, conversion_rate: 0 })
    markDirty()
  }
  function removeOtherSource(index: number) {
    data.value.other_sources.splice(index, 1)
    markDirty()
  }

  return {
    data, isLoaded, isDirty,
    computedTotalLeads, computedTotalAdSpend, computedConversionRate,
    initNew, load, save, markDirty,
    addChannelLead, removeChannelLead, sortChannels,
    addDouyinAccount, removeDouyinAccount,
    addDouyinAdAccount, removeDouyinAdAccount,
    addXiaohongshuAccount, removeXiaohongshuAccount,
    addXiaohongshuAdAccount, removeXiaohongshuAdAccount,
    addOtherSource, removeOtherSource
  }
})
