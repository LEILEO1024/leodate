export interface ReportData {
  id?: number
  region: string
  year: number
  month: number
  total_leads: number
  total_orders: number
  online_revenue: number
  offline_revenue: number
  total_ad_spend: number
  channel_leads: ChannelLead[]
  deal_sources: DealSource[]
}

export interface ReportSummary {
  id: number
  region: string
  year: number
  month: number
  total_leads: number
  total_orders: number
  online_revenue: number
  offline_revenue: number
  total_ad_spend: number
  created_at: string
  updated_at: string
}

export interface ChannelLead {
  channel_name: string
  lead_count: number
}

export interface DealSource {
  source_name: string
  order_count: number
  revenue: number
  conversion_rate: number
}
