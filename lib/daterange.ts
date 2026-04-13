/**
 * Parse and validate a date range from URL search params.
 * Dates are YYYY-MM-DD (local date). Range is inclusive of both ends.
 * Returns ISO timestamps at start-of-day(start) and end-of-day(end) for
 * use with `created_at >= start AND created_at <= end` filters.
 */

export type DateRange = {
  /** YYYY-MM-DD form, for the date picker display. */
  startDate: string
  endDate:   string
  /** ISO timestamp at 00:00:00.000 of startDate (local server TZ). */
  startIso: string
  /** ISO timestamp at 23:59:59.999 of endDate. */
  endIso:   string
  /** If the range matches a preset (days from today), its day count. */
  matchingPreset: number | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfDay(isoDay: string): Date {
  const d = new Date(`${isoDay}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(isoDay: string): Date {
  const d = new Date(`${isoDay}T00:00:00`)
  d.setHours(23, 59, 59, 999)
  return d
}

const PRESET_DAYS = [7, 30, 90]

export function parseDateRange(
  params: { start?: string; end?: string },
  defaultDays = 30
): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let endDate: string = params.end && /^\d{4}-\d{2}-\d{2}$/.test(params.end)
    ? params.end
    : isoDate(today)

  let startDate: string
  if (params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start)) {
    startDate = params.start
  } else {
    const s = new Date(today)
    s.setDate(s.getDate() - (defaultDays - 1))
    startDate = isoDate(s)
  }

  // Swap if user reversed them
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate]

  // Compute matching preset if end===today and span fits
  let matchingPreset: number | null = null
  if (endDate === isoDate(today)) {
    const spanDays = Math.round(
      (startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / 86_400_000
    ) + 1
    if (PRESET_DAYS.includes(spanDays)) matchingPreset = spanDays
  }

  return {
    startDate,
    endDate,
    startIso: startOfDay(startDate).toISOString(),
    endIso: endOfDay(endDate).toISOString(),
    matchingPreset,
  }
}
