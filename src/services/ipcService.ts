import type { ReportData, ReportSummary } from '@/types'

export const ipcService = {
  async getReport(region: string, year: number, month: number): Promise<ReportData | null> {
    return window.api.getReport(region, year, month)
  },

  async saveReport(data: ReportData): Promise<{ success: boolean; error?: string }> {
    return window.api.saveReport(data)
  },

  async deleteReport(region: string, year: number, month: number): Promise<{ success: boolean; error?: string }> {
    return window.api.deleteReport(region, year, month)
  },

  async listReports(): Promise<ReportSummary[]> {
    return window.api.listReports()
  },

  async getAllReportsForChart(): Promise<ReportSummary[]> {
    return window.api.getAllReportsForChart()
  },

  async generatePdf(region: string, year: number, month: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
    return window.api.generatePdf(region, year, month)
  },

  async openExcelFile(): Promise<{ success: boolean; entries?: any[]; error?: string }> {
    return window.api.openExcelFile()
  }
}
