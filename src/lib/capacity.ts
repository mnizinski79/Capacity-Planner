import {
  eachDayOfInterval,
  isWeekend,
  isSameDay,
} from "date-fns"

export interface SprintCapacityResult {
  baseCapacity: number
  workingDays: number
  holidayDays: number
  vacationDays: number
  deductionPoints: number
  netCapacity: number
  isOverride: boolean
}

export interface UserCapacityRow {
  userId: string
  userName: string
  teamId: string | null
  teamName: string | null
  sprints: Record<string, SprintCapacityResult & { sprintId: string; label: string }>
  quarterTotal: number
}

/**
 * Normalizes a Date to local midnight using its UTC date components.
 * This correctly handles dates stored as UTC midnight (T00:00:00Z) and dates
 * stored as local midnight with a timezone offset (e.g. T04:00:00Z for EDT),
 * since both represent the same calendar date when read via UTC accessors.
 */
function dateOnly(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Returns count of holiday dates that fall on working days within a sprint.
 */
export function countHolidayDays(
  startDate: Date,
  endDate: Date,
  holidayDates: Date[]
): number {
  const days = eachDayOfInterval({ start: dateOnly(startDate), end: dateOnly(endDate) })
  return holidayDates.filter((h) => {
    const hDay = dateOnly(h)
    return days.some((d) => isSameDay(d, hDay)) && !isWeekend(hDay)
  }).length
}

/**
 * Returns count of vacation days that fall on working days within a sprint (no double-counting holidays).
 */
export function countVacationDays(
  startDate: Date,
  endDate: Date,
  vacationDates: Date[],
  holidayDates: Date[]
): number {
  const days = eachDayOfInterval({ start: dateOnly(startDate), end: dateOnly(endDate) })
  return vacationDates.filter((v) => {
    const vDay = dateOnly(v)
    const inSprint = days.some((d) => isSameDay(d, vDay))
    if (!inSprint) return false
    if (isWeekend(vDay)) return false
    if (holidayDates.some((h) => isSameDay(dateOnly(h), vDay))) return false
    return true
  }).length
}

/**
 * Calculates net capacity for a single user in a single sprint.
 */
export function calculateNetCapacity(
  baseCapacity: number,
  sprintStart: Date,
  sprintEnd: Date,
  holidayDates: Date[],
  vacationDates: Date[],
  override?: number
): SprintCapacityResult {
  if (override !== undefined) {
    return {
      baseCapacity,
      workingDays: 0,
      holidayDays: 0,
      vacationDays: 0,
      deductionPoints: 0,
      netCapacity: override,
      isOverride: true,
    }
  }

  const allWeekdays = eachDayOfInterval({ start: dateOnly(sprintStart), end: dateOnly(sprintEnd) }).filter(
    (d) => !isWeekend(d)
  )
  const totalWorkingDays = allWeekdays.length

  if (totalWorkingDays === 0) {
    return {
      baseCapacity,
      workingDays: 0,
      holidayDays: 0,
      vacationDays: 0,
      deductionPoints: 0,
      netCapacity: 0,
      isOverride: false,
    }
  }

  const holidayDays = countHolidayDays(sprintStart, sprintEnd, holidayDates)
  const vacationDays = countVacationDays(sprintStart, sprintEnd, vacationDates, holidayDates)

  const deductionPct = (holidayDays + vacationDays) / totalWorkingDays
  const net = Math.max(0, Math.floor(baseCapacity * (1 - deductionPct)))

  return {
    baseCapacity,
    workingDays: totalWorkingDays,
    holidayDays,
    vacationDays,
    deductionPoints: baseCapacity - net,
    netCapacity: net,
    isOverride: false,
  }
}

export function toDateOnly(date: Date): Date {
  return dateOnly(date)
}
