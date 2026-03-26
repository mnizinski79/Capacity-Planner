"use client"

import { format, isSameDay, isWeekend, eachDayOfInterval } from "date-fns"

interface SprintCalendarProps {
  startDate: string
  endDate: string
}

const SPRINT_DAY_NOTES: Record<number, { text: string; highlight?: "red" }> = {
  0: { text: "Sprint Start" },
  1: { text: "Deadline to kick off work" },
  2: { text: "Draft Problem statements" },
  5: { text: "Manager review" },
  7: { text: "Product Review", highlight: "red" },
  9: { text: "End of sprint" },
}

function dateOnly(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function SprintCalendar({ startDate, endDate }: SprintCalendarProps) {
  // Use client-side local date for "today" to avoid UTC vs local timezone mismatch
  const now = new Date()
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const sprintDays = eachDayOfInterval({
    start: dateOnly(new Date(startDate)),
    end: dateOnly(new Date(endDate)),
  }).filter((d) => !isWeekend(d))

  if (sprintDays.length === 0) return null

  const renderDayCell = (day: Date, idx: number) => {
    const note = SPRINT_DAY_NOTES[idx]
    const isToday = isSameDay(day, todayLocal)
    return (
      <div key={idx} className="flex-1 min-w-0">
        <div className="h-8 mb-1 flex flex-col justify-end">
          {isToday && (
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Today</p>
          )}
          <p className={`text-sm ${isToday ? "font-bold" : "text-muted-foreground"}`}>
            {format(day, "EEEE")}
          </p>
        </div>
        <div
          className={[
            "rounded-md border p-2.5 min-h-[80px] text-xs text-muted-foreground",
            isToday ? "border-primary bg-primary/5" : "",
            note?.highlight === "red" ? "!border-red-400 bg-red-50 text-red-700" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {note?.text}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {[0, 1].map((rowIndex) => {
        const rowDays = sprintDays.slice(rowIndex * 5, rowIndex * 5 + 5)
        if (rowDays.length === 0) return null

        return (
          <div key={rowIndex} className="flex gap-3 items-start">
            {rowDays.slice(0, 3).map((day, i) => renderDayCell(day, rowIndex * 5 + i))}

            {/* Weekend separator */}
            <div className="flex flex-col items-center self-stretch">
              <div className="h-8 mb-1" />
              <div className="relative flex-1 w-px bg-border mx-1 flex items-center justify-center">
                <span className="absolute [writing-mode:vertical-rl] text-[10px] text-muted-foreground bg-card px-0.5 select-none">
                  Weekend
                </span>
              </div>
            </div>

            {rowDays.slice(3, 5).map((day, i) => renderDayCell(day, rowIndex * 5 + 3 + i))}
          </div>
        )
      })}
    </div>
  )
}
