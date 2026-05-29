import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReportData, ChannelLead, OrganicAccount, AdAccount, OtherChannel, OrderEntry } from '@/types'
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
    order_entries: [],
    channel_leads: []
  }
}

function buildChannelLeads(data: any) {
  const map = new Map<string, number>()
  for (const a of data.organic_accounts || []) {
    if (a.organic_leads > 0) map.set(`${a.platform_name}(自然流)`, (map.get(`${a.platform_name}(自然流)`) || 0) + (a.organic_leads || 0))
  }
  for (const a of data.ad_accounts || []) {
    if (a.lead_count > 0) map.set(`${a.platform_name}(投流)`, (map.get(`${a.platform_name}(投流)`) || 0) + (a.lead_count || 0))
  }
  for (const c of data.other_channels || []) {
    if (c.lead_count > 0) map.set(c.channel_name, (map.get(c.channel_name) || 0) + (c.lead_count || 0))
  }
  return Array.from(map.entries()).map(([channel_name, lead_count]) => ({ channel_name, lead_count })).sort((a, b) => b.lead_count - a.lead_count)
}

export const useReportStore = defineStore('report', () => {
  const data = ref<ReportData>(emptyReport('', new Date().getFullYear(), new Date().getMonth() + 1))
  const isLoaded = ref(false)
  const isDirty = ref(false)

  const generatedChannelLeads = computed(() => buildChannelLeads(data.value))
  const computedTotalLeads = computed(() => generatedChannelLeads.value.reduce((s, c) => s + (c.lead_count || 0), 0))
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

  // Platform management
  const organicPlatforms = ref<{ id: number; name: string }[]>([])
  const adPlatforms = ref<{ id: number; name: string }[]>([])
  let pid = 1

  const organicGroups = computed(() => organicPlatforms.value.map(p => ({
    id: p.id,
    name: p.name,
    accounts: data.value.organic_accounts.filter(a => a.platform_name === p.name)
  })))

  const adGroups = computed(() => adPlatforms.value.map(p => ({
    id: p.id,
    name: p.name,
    accounts: data.value.ad_accounts.filter(a => a.platform_name === p.name)
  })))

  function initNew(region: string, year: number, month: number) {
    data.value = emptyReport(region, year, month)
    organicPlatforms.value = []
    adPlatforms.value = []
    isLoaded.value = false
    isDirty.value = false
  }

  async function load(region: string, year: number, month: number) {
    const existing = await ipcService.getReport(region, year, month)
    if (existing && !(existing as any).error) {
      data.value = existing
      isLoaded.value = true
      const oNames = [...new Set((data.value.organic_accounts || []).map(a => a.platform_name).filter(Boolean))]
      organicPlatforms.value = oNames.map(n => ({ id: pid++, name: n }))
      const aNames = [...new Set((data.value.ad_accounts || []).map(a => a.platform_name).filter(Boolean))]
      adPlatforms.value = aNames.map(n => ({ id: pid++, name: n }))
    } else {
      data.value = emptyReport(region, year, month)
      isLoaded.value = false
      organicPlatforms.value = []
      adPlatforms.value = []
    }
    isDirty.value = false
  }

  async function save(): Promise<{ success: boolean; error?: string }> {
    try {
      const clean = JSON.parse(JSON.stringify(data.value))
      clean.organic_accounts = (clean.organic_accounts || []).filter((a: any) => a.platform_name?.trim() && a.account_name?.trim())
      clean.ad_accounts = (clean.ad_accounts || []).filter((a: any) => a.platform_name?.trim() && a.account_name?.trim())
      clean.other_channels = (clean.other_channels || []).filter((c: any) => c.channel_name?.trim())
      clean.order_entries = (clean.order_entries || []).filter((o: any) => o.order_content?.trim() || o.product_name?.trim())

      for (const a of clean.ad_accounts) {
        if (a.lead_count > 0 && a.ad_spend > 0) a.lead_cost = Math.round((a.ad_spend / a.lead_count) * 100) / 100
      }
      for (const c of clean.other_channels) {
        if (c.lead_count > 0 && c.ad_spend > 0) c.lead_cost = Math.round((c.ad_spend / c.lead_count) * 100) / 100
        if (c.lead_count > 0 && c.order_count > 0) c.conversion_rate = Math.round((c.order_count / c.lead_count) * 10000) / 100
      }

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
        isDirty.value = false
        isLoaded.value = true
        return { success: true }
      }
      return { success: false, error: result.error || '未知错误' }
    } catch (e: any) { return { success: false, error: e.message || String(e) } }
  }

  function markDirty() { isDirty.value = true }

  // Organic
  function addOrganicPlatform() { organicPlatforms.value.push({ id: pid++, name: '' }); markDirty() }
  function addOrganicAccount(platId: number, platName: string) {
    data.value.organic_accounts.push({ platform_name: platName, account_name: '', content_updated: 0, organic_leads: 0 })
    markDirty()
  }
  function syncOrganicName(platId: number, newName: string) {
    const p = organicPlatforms.value.find(x => x.id === platId)
    if (p) {
      for (const a of data.value.organic_accounts) { if (a.platform_name === p.name) a.platform_name = newName }
      p.name = newName
    }
    markDirty()
  }
  function removeOrganicPlatform(platId: number) {
    const p = organicPlatforms.value.find(x => x.id === platId)
    if (p) data.value.organic_accounts = data.value.organic_accounts.filter(a => a.platform_name !== p.name)
    organicPlatforms.value = organicPlatforms.value.filter(x => x.id !== platId)
    markDirty()
  }
  function removeOrganicAccount(index: number) { data.value.organic_accounts.splice(index, 1); markDirty() }

  // Ad
  function addAdPlatform() { adPlatforms.value.push({ id: pid++, name: '' }); markDirty() }
  function addAdAccount(platId: number, platName: string) {
    data.value.ad_accounts.push({ platform_name: platName, account_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0 })
    markDirty()
  }
  function syncAdName(platId: number, newName: string) {
    const p = adPlatforms.value.find(x => x.id === platId)
    if (p) {
      for (const a of data.value.ad_accounts) { if (a.platform_name === p.name) a.platform_name = newName }
      p.name = newName
    }
    markDirty()
  }
  function removeAdPlatform(platId: number) {
    const p = adPlatforms.value.find(x => x.id === platId)
    if (p) data.value.ad_accounts = data.value.ad_accounts.filter(a => a.platform_name !== p.name)
    adPlatforms.value = adPlatforms.value.filter(x => x.id !== platId)
    markDirty()
  }
  function removeAdAccount(index: number) { data.value.ad_accounts.splice(index, 1); markDirty() }

  // Other channels
  function addOtherChannel() { data.value.other_channels.push({ channel_name: '', ad_spend: 0, lead_count: 0, lead_cost: 0, order_count: 0, conversion_rate: 0 }); markDirty() }
  function removeOtherChannel(index: number) { data.value.other_channels.splice(index, 1); markDirty() }

  // Order entries
  function addOrderEntry() { data.value.order_entries.push({ order_time: '', order_content: '', order_status: '', order_creator: '', deal_count: '', product_name: '', customer_info: '', contact_info: '', customer_source: '', order_amount: 0 }); markDirty() }
  function removeOrderEntry(index: number) { data.value.order_entries.splice(index, 1); markDirty() }

  return {
    data, isLoaded, isDirty,
    computedTotalLeads, computedTotalAdSpend, computedConversionRate,
    generatedChannelLeads, organicPlatforms, adPlatforms, organicGroups, adGroups,
    initNew, load, save, markDirty,
    addOrganicPlatform, addOrganicAccount, syncOrganicName, removeOrganicPlatform, removeOrganicAccount,
    addAdPlatform, addAdAccount, syncAdName, removeAdPlatform, removeAdAccount,
    addOtherChannel, removeOtherChannel, addOrderEntry, removeOrderEntry
  }
})
