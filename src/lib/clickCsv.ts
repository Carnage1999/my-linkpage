export interface CsvLinkRow {
  id: string
  label: string
  status: 'active' | 'removed'
  redisClicks: number
  umamiClicks: number | null
}

export interface CsvDayRow {
  date: string
  id: string
  label: string
  redisClicks: number
}

function cell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function buildClickCsv(links: readonly CsvLinkRow[], days: readonly CsvDayRow[]): string {
  const header = ['section', 'date', 'id', 'label', 'status', 'redis_clicks', 'umami_clicks']
  const lines = [header.join(',')]
  for (const link of links) {
    lines.push(
      [
        'period',
        '',
        link.id,
        link.label,
        link.status,
        link.redisClicks,
        link.umamiClicks ?? '',
      ]
        .map(cell)
        .join(','),
    )
  }
  for (const day of days) {
    lines.push(
      ['day', day.date, day.id, day.label, 'active', day.redisClicks, ''].map(cell).join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
