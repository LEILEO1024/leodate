export function formatNumber(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '0'
  return n.toLocaleString('zh-CN')
}

export function formatMoney(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '0 元'
  return n.toLocaleString('zh-CN') + ' 元'
}

export function formatPercent(n: number | undefined | null, decimals = 1): string {
  if (n == null || isNaN(n)) return '0%'
  return n.toFixed(decimals) + '%'
}
