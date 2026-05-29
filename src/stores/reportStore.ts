import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReportData, ChannelLead, DealSource } from '@/types'
import { ipcService } from '@/services/ipcService'

function emptyReport(region: string, year: number, month: number): ReportData {
  return {
    region, year, month,
    total_leads: 0, total_orders: 0,
    online_revenue: 0, offline_revenue: 0,
    total_ad_spend: 0,
    channel_leads: [],
    deal_sources: []
  }
}

export const useReportStore = defineStore('report', () => {
  const data = ref<ReportData>(emptyReport('', new Date().getFullYear(), new Date().getMonth() + 1))
  const isLoaded = ref(false)
  const isDirty = ref(false)

  const computedTotalLeads = computed(() =>
    data.value.channel_leads.reduce((sum, c) => sum + (c.lead_count || 0), 0)
  )

  const computedTotalAdSpend = computed(() =>
    data.value.deal_sources.reduce((sum, d) => sum + (d.revenue || 0), 0)
  )

  const computedConversionRate = computed(() => {
    if (!data.value.total_leads) return 0
    return Math.round((data.value.total_orders / data.value.total_leads) * 10000) / 100
  })

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
      clean.channel_leads = (clean.channel_leads || []).filter((c: any) => c.channel_name?.trim())
      clean.channel_leads.sort((a: any, b: any) => (b.lead_count || 0) - (a.lead_count || 0))
      clean.deal_sources = (clean.deal_sources || []).filter((s: any) => s.source_name?.trim())
      clean.total_leads = computedTotalLeads.value || 0
      clean.total_ad_spend = computedTotalAdSpend.value || 0

      const result = await ipcService.saveReport(clean)
      if (result.success) {
        data.value.channel_leads = clean.channel_leads
        data.value.deal_sources = clean.deal_sources
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

  function addDealSource() {
    data.value.deal_sources.push({ source_name: '', order_count: 0, revenue: 0, conversion_rate: 0 })
    markDirty()
  }

  function removeDealSource(index: number) {
    data.value.deal_sources.splice(index, 1)
    markDirty()
  }

  return {
    data, isLoaded, isDirty,
    computedTotalLeads, computedTotalAdSpend, computedConversionRate,
    initNew, load, save, markDirty,
    addChannelLead, removeChannelLead, sortChannels,
    addDealSource, removeDealSource
  }
})
