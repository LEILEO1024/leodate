import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getReport: (region: string, year: number, month: number) =>
    ipcRenderer.invoke('db:getReport', region, year, month),

  saveReport: (data: unknown) =>
    ipcRenderer.invoke('db:saveReport', data),

  deleteReport: (region: string, year: number, month: number) =>
    ipcRenderer.invoke('db:deleteReport', region, year, month),

  listReports: () =>
    ipcRenderer.invoke('db:listReports'),

  getAllReportsForChart: () =>
    ipcRenderer.invoke('db:getAllReportsForChart'),

  generatePdf: (region: string, year: number, month: number) =>
    ipcRenderer.invoke('pdf:generate', region, year, month),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
})
