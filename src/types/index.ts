// ============================================================
// Core report types
// ============================================================

export interface ReportData {
  id?: number
  region: string
  year: number
  month: number
  // Core metrics (部分自动计算)
  total_leads: number
  total_orders: number
  online_revenue: number
  offline_revenue: number
  total_ad_spend: number

  // Child data (5 modules)
  channel_leads: ChannelLead[]
  douyin_accounts: DouyinAccount[]
  douyin_ad_accounts: DouyinAdAccount[]
  xiaohongshu_accounts: XiaohongshuAccount[]
  xiaohongshu_ad_accounts: XiaohongshuAdAccount[]
  other_sources: OtherSource[]
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

// ============================================================
// Module 2: Channel leads
// ============================================================

export interface ChannelLead {
  channel_name: string
  lead_count: number
}

// ============================================================
// Module 3: Douyin
// ============================================================

export interface DouyinAccount {
  account_name: string
  videos_updated: number
  organic_leads: number
}

export interface DouyinAdAccount {
  account_name: string
  ad_spend: number
  lead_count: number
  lead_cost: number
}

// ============================================================
// Module 4: Xiaohongshu
// ============================================================

export interface XiaohongshuAccount {
  account_name: string
  posts_updated: number
  organic_leads: number
}

export interface XiaohongshuAdAccount {
  account_name: string
  ad_spend: number
  lead_count: number
  lead_cost: number
}

// ============================================================
// Module 5: Other sources
// ============================================================

export interface OtherSource {
  source_name: string
  ad_spend: number
  lead_count: number
  lead_cost: number
  order_count: number
  conversion_rate: number
}
