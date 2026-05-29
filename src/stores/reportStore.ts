import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReportData, ChannelLead, OrganicAccount, AdAccount, OtherChannel } from '@/types'
import { ipcService } from '@/services/ipcService'

function emptyReport(region: string, year: number, month: number): ReportData {
  return {
    region, year, month,
    total_leads: 0, total_orders: 0,
    online_revenue: 0, offline_revenue: 0,
    total_ad_spend: 0,
    organic_accounts: [],
    ad_accounts: [],
    other_channels: [],
    channel_leads: []
  }
}

// Build channel_leads from organic + ad + other channels
function buildChannelLeads(data: any) {
  const map = new Map<string, number>()

  // 自然流按平台汇总
  for (const a of data.organic_accounts || []) {
    if (a.organic_leads > 0) {
      const name = `${a.platform_name}(自然流)`
      map.set(name, (map.get(name) || 0) + (a.organic_leads || 0))
    }
  }
  // 投流按平台汇总
  for (const a of data.ad_accounts || []) {
    if (a.lead_count > 0) {
      const name = `${a.platform_name}(投流)`
      map.set(name, (map.get(name) || 0) + (a.lead_count || 0))
    }
  }
  // 其他渠道独立
  for (const c of data.other_channels || []) {
    if (c.lead_count > 0) {
      map.set(c.channel_name, (map.get(c.channel_name) || 0) + (c.lead_count || 0))
    }
  }

  return Array.from(map.entries())
    .map(([channel_name, lead_count]) => ({ channel_name, lead_count }))
    .sort((a, b) => b.lead_count - a.lead_count)
}

export const useReportStore = defineStore('report', () => {
  const data = ref<ReportData>(emptyReport('', new Date().getFullYear(), new Date().getMonth() + 1))
  const isLoaded = ref(false)
  const isDirty = ref(false)

  const generatedChannelLeads = computed(() => buildChannelLeads(data.value))

  const computedTotalLeads = computed(() =>
    generatedChannelLeads.value.reduce((s, c) => s + (c.lead_count || 0), 0)
  )

  const computedTotalAdSpend = computed(() => {
    let total = 0
    total += data.value.ad_accounts.reduce((s, a) => s + (a.ad_spend || 0), 0)
    total += data.value.other_channels.reduce((s, c) => s + (c.ad_spend || 0), 0)
    return total
  })

  const computedConversionRate = computed(() => {
    if (!data.value.total_leads) return 0
    return Math.round((data.value.total_orders / data.value.total_leads) * 10000) / 100
  })

  // Group organic accounts by platform (for UI display)
  const organicPlatforms = computed(() => {
    const map = new Map<string, OrganicAccount[]>()
    for (const a of data.value.organic_accounts) {
      const key = a.platform_name || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries()).map(([name, accounts]) => ({ name, accounts }))
  })

  // Group ad accounts by platform (for UI display)
  const adPlatforms = computed(() => {
    const map = new Map<string, AdAccount[]>()
    for (const a of data.value.ad_accounts) {
      const key = a.platform_name || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries()).map(([name, accounts]) => ({ name, accounts }))
  })

  function initNew(region: string, year: number, month: number) {
    data.value = emptyReport(region, year, month)
    isLoaded.value = false; isDirty.value = false
  }

  async function load(region: string, year: number, month: number) {
    const existing = await ipcService.getReport(region, year, month)
    if (existing && !(existing as any).error) {
      data.value = existing; isLoaded.value = true
    } else {
      data.value = emptyReport(region, year, month); isLoaded.value = false
    }
    isDirty.value = false
  }

  async function save(): Promise<{ success: boolean; error?: string }> {
    try {
      const clean = JSON.parse(JSON.stringify(data.value))

      // Filter empties
      clean.organic_accounts = (clean.organic_accounts || []).filter((a: any) => a.account_name?.trim() && a.platform_name?.trim())
      clean.ad_accounts = (clean.ad_accounts || []).filter((a: any) => a.account_name?.trim() && a.platform_name?.trim())
      clean.other_channels = (clean.other_channels || []).filter((c: any) => c.channel_name?.trim())

      // Auto-calc
      for (const a of clean.ad_accounts) {
        if (a.lead_count > 0 && a.ad_spend > 0) a.lead_cost = Math.round((a.ad_spend / a.lead_count) * 100) / 100
      }
      for (const c of clean.other_channels) {
        if (c.lead_count > 0 && c.ad_spend > 0) c.lead_cost = Math.round((c.ad_spend / c.lead_count) * 100) / 100
        if (c.lead_count > 0 && c.order_count > 0) c.conversion_rate = Math.round((c.order_count / c.lead_count) * 10000) / 100
      }

      // Auto-generate channel_leads
      clean.channel_leads = generatedChannelLeads.value
      clean.total_leads = computedTotalLeads.value
      clean.total_ad_spend = computedTotalAdSpend.value

      const result = await ipcService.saveReport(clean)
      if (result.success) {
        data.value.organic_accounts = clean.organic_accounts
        data.value.ad_accounts = clean.ad_accounts
        data.value.other_channels = clean.other_channels
        data.value.total_leads = clean.total_leads
        data.value.total_ad_spend = clean.total_ad_spend
        isDirty.value = false; isLoaded.value = true
        return { success: true }
      }
      return { success: false, error: result.error || '未知错误' }
    } catch (e: any) { return { success: false, error: e.message || String(e) } }
  }

  function markDirty() { isDirty.value = true }

  // ---- Step 1: Organic accounts ----
  function addOrganicPlatform() {
    data.value.organic_accounts.push({ platform_name: '', account_name: '', content_updated: 0, organic_leads: 0 })
    markDirty()
  }
  function removeOrganicAccount(index: number) { data.value.organic_accounts.splice(index, 1); markDirty() }

  // ---- Step 2: Ad accounts ----
  function addAdPlatform() {
    data.value.ad_accounts.push({ platform_name: '', account_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0 })
    markDirty()
  }
  function removeAdAccount(index: number) { data.value.ad_accounts.splice(index, 1); markDirty() }

  // ---- Step 3: Other channels ----
  function addOtherChannel() {
    data.value.other_channels.push({ channel_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0, order_count: 0, conversion_rate: 0 })
    markDirty()
  }
  function removeOtherChannel(index: number) { data.value.other_channels.splice(index, 1); markDirty() }

  return {
    data, isLoaded, isDirty,
    computedTotalLeads, computedTotalAdSpend, computedConversionRate,
    generatedChannelLeads, organicPlatforms, adPlatforms,
    initNew, load, save, markDirty,
    addOrganicPlatform, removeOrganicAccount,
    addAdPlatform, removeAdAccount,
    addOtherChannel, removeOtherChannel
  }
})
