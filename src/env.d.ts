/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  api: {
    getReport: (region: string, year: number, month: number) => Promise<any>
    saveReport: (data: any) => Promise<{ success: boolean; error?: string }>
    deleteReport: (region: string, year: number, month: number) => Promise<{ success: boolean; error?: string }>
    listReports: () => Promise<any[]>
    getAllReportsForChart: () => Promise<any[]>
    generatePdf: (region: string, year: number, month: number) => Promise<{ success: boolean; filePath?: string; error?: string }>
    minimizeWindow: () => void
    maximizeWindow: () => void
    closeWindow: () => void
  }
}
