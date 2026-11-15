export interface DailyClicks {
  date: string
  clicks: Record<string, number>
}

export interface RemovedLink {
  id: string
  total: number
  period: number
}

export interface ClickReport {
  totals: Record<string, number>
  periodTotals: Record<string, number>
  previousPeriodTotals: Record<string, number>
  daily: DailyClicks[]
  configuredIds: string[]
  removed: RemovedLink[]
}

export function parseRedisHash(result: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (Array.isArray(result)) {
    for (let index = 0; index < result.length; index += 2) {
      const key = String(result[index] ?? '')
      const value = Number(result[index + 1])
      if (key && Number.isFinite(value)) out[key] = value
    }
    return out
  }
  if (result && typeof result === 'object') {
    for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
      const numeric = Number(value)
      if (Number.isFinite(numeric)) out[key] = numeric
    }
  }
  return out
}

function addClick(bucket: Record<string, number>, id: string, count: number) {
  bucket[id] = (bucket[id] ?? 0) + count
}

function sumDates(
  dayFields: Record<string, number>,
  dates: ReadonlySet<string>,
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const [field, count] of Object.entries(dayFields)) {
    const date = field.slice(0, 10)
    const id = field.slice(11)
    if (!id || !dates.has(date) || !Number.isFinite(count)) continue
    addClick(totals, id, count)
  }
  return totals
}

export function aggregateClicks(input: {
  totals: Record<string, number>
  dayFields: Record<string, number>
  currentDates: readonly string[]
  previousDates: readonly string[]
  configuredIds: readonly string[]
}): ClickReport {
  const current = new Set(input.currentDates)
  const previous = new Set(input.previousDates)
  const configured = new Set(input.configuredIds)
  const periodTotals = sumDates(input.dayFields, current)
  const previousPeriodTotals = sumDates(input.dayFields, previous)

  const daily: DailyClicks[] = input.currentDates.map((date) => {
    const clicks: Record<string, number> = {}
    for (const [field, count] of Object.entries(input.dayFields)) {
      if (!field.startsWith(`${date}:`)) continue
      const id = field.slice(date.length + 1)
      if (id) clicks[id] = count
    }
    return { date, clicks }
  })

  const seen = new Set<string>([
    ...Object.keys(input.totals),
    ...Object.keys(periodTotals),
    ...Object.keys(previousPeriodTotals),
  ])
  const removed: RemovedLink[] = [...seen]
    .filter((id) => !configured.has(id))
    .map((id) => ({
      id,
      total: input.totals[id] ?? 0,
      period: periodTotals[id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))

  return {
    totals: input.totals,
    periodTotals,
    previousPeriodTotals,
    daily,
    configuredIds: [...input.configuredIds],
    removed,
  }
}
