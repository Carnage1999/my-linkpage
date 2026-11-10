/** Calendar-day helpers. Day boundaries follow an IANA timezone (default Asia/Taipei). */

export const DEFAULT_STATS_TIMEZONE = 'Asia/Taipei'
export const RETENTION_DAYS = 180
export const RANGE_OPTIONS = [7, 30, 90] as const
export type StatsRange = (typeof RANGE_OPTIONS)[number]

export function isStatsRange(value: number): value is StatsRange {
  return value === 7 || value === 30 || value === 90
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) {
    throw new Error(`Unable to format a date in ${timeZone}`)
  }
  return `${year}-${month}-${day}`
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second'),
  )
  return asUtc - instant.getTime()
}

/** UTC timestamp of 00:00 on the calendar day that contains `date` in `timeZone`. */
export function startOfZonedDay(date: Date, timeZone: string): number {
  const key = dateKeyInTimeZone(date, timeZone)
  const [year, month, day] = key.split('-').map(Number)
  const utcMidnight = Date.UTC(year, month - 1, day)
  const offset = zoneOffsetMs(new Date(utcMidnight), timeZone)
  const start = utcMidnight - offset
  if (
    dateKeyInTimeZone(new Date(start), timeZone) === key &&
    dateKeyInTimeZone(new Date(start - 1), timeZone) !== key
  ) {
    return start
  }

  for (let hour = -36; hour <= 36; hour += 1) {
    const candidate = utcMidnight + hour * 3_600_000
    if (
      dateKeyInTimeZone(new Date(candidate), timeZone) === key &&
      dateKeyInTimeZone(new Date(candidate - 1), timeZone) !== key
    ) {
      return candidate
    }
  }

  return start
}

function instantOnDate(key: string, timeZone: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  const noon = Date.UTC(year, month - 1, day, 12)
  if (dateKeyInTimeZone(new Date(noon), timeZone) === key) {
    return new Date(noon)
  }
  for (let hour = -30; hour <= 30; hour += 1) {
    const candidate = noon + hour * 3_600_000
    if (dateKeyInTimeZone(new Date(candidate), timeZone) === key) {
      return new Date(candidate)
    }
  }
  return new Date(noon)
}

/** `count` calendar dates ending on the day that contains `now`, oldest first. */
export function recentDateKeys(now: Date, count: number, timeZone: string): string[] {
  const keys: string[] = []
  let cursor = now
  while (keys.length < count) {
    keys.push(dateKeyInTimeZone(cursor, timeZone))
    cursor = new Date(startOfZonedDay(cursor, timeZone) - 1)
  }
  return keys.reverse()
}

export interface PeriodRange {
  currentDates: string[]
  previousDates: string[]
  /** Inclusive start of the current period, UTC ms. */
  startAt: number
  /** Exclusive end (start of the next local day), UTC ms. */
  endAt: number
}

export function periodRange(now: Date, days: number, timeZone: string): PeriodRange {
  const currentDates = recentDateKeys(now, days, timeZone)
  const oldestStart = startOfZonedDay(instantOnDate(currentDates[0], timeZone), timeZone)
  const previousDates = recentDateKeys(new Date(oldestStart - 1), days, timeZone)
  const todayKey = currentDates[currentDates.length - 1]
  const todayStart = startOfZonedDay(instantOnDate(todayKey, timeZone), timeZone)
  let endAt = todayStart + 3_600_000
  while (dateKeyInTimeZone(new Date(endAt), timeZone) === todayKey) {
    endAt += 3_600_000
  }
  endAt = startOfZonedDay(new Date(endAt), timeZone)
  return { currentDates, previousDates, startAt: oldestStart, endAt }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}
