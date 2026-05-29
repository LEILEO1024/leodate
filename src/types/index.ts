// ============================================================
// Core report types
// ============================================================

export interface ReportData {
  id?: number
  region: string
  year: number
  month: number

  // Core metrics
  total_leads: number
  total_orders: number
  online_revenue: number
  offline_revenue: number
  total_ad_spend: number

  // Child data (3 modules)
  organic_accounts: OrganicAccount[]     // 步骤1: 账号运营情况
  ad_accounts: AdAccount[]               // 步骤2: 投流情况
  other_channels: OtherChannel[]         // 步骤3: 其他渠道
  channel_leads: ChannelLead[]           // 自动汇总：供报告和历史数据使用
}

export interface ChannelLead {
  channel_name: string
  lead_count: number
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
// Step 1: 账号运营情况 (organic accounts grouped by platform)
// ============================================================

export interface OrganicAccount {
  platform_name: string
  account_name: string
  content_updated: number
  organic_leads: number
}

// ============================================================
// Step 2: 投流情况 (ad accounts grouped by platform)
// ============================================================

export interface AdAccount {
  platform_name: string
  account_name: string
  ad_spend: number
  lead_count: number
  lead_cost: number
}

// ============================================================
// Step 3: 其他渠道
// ============================================================

export interface OtherChannel {
  channel_name: string
  ad_spend: number
  lead_count: number
  lead_cost: number
  order_count: number
  conversion_rate: number
}
