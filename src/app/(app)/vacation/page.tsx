"use client"

import { useEffect, useState, useCallback } from "react"
import { format, isSameDay, startOfDay } from "date-fns"
import { QuarterSelector } from "@/components/quarter-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { X, Save, Plane } from "lucide-react"

// Parse a date string (e.g. "2026-04-07" or "2026-04-07T00:00:00.000Z") as local midnight.
// Avoids the UTC→local timezone shift that new Date("YYYY-MM-DD") causes in US timezones.
function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Format a local-midnight Date as a date-only string for the API ("YYYY-MM-DD").
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

interface Quarter {
  id: string
  label: string
  isActive: boolean
  sprints?: { startDate: string; endDate: string }[]
}
interface VacationDay { id: string; date: string }

export default function VacationPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null)
  const [savedDates, setSavedDates] = useState<Date[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch("/api/quarters")
      .then((r) => r.json())
      .then((q: Quarter[]) => {
        setQuarters(q)
        if (q.length > 0) setSelectedQuarterId((q.find((x: Quarter) => x.isActive) ?? q[0]).id)
      })
  }, [])

  const loadVacation = useCallback(() => {
    if (!selectedQuarterId) return
    Promise.all([
      fetch(`/api/vacation?quarterId=${selectedQuarterId}`).then((r) => r.json()),
      fetch(`/api/quarters/${selectedQuarterId}`).then((r) => r.json()),
    ]).then(([vacation, quarter]: [VacationDay[], Quarter]) => {
      const dates = vacation.map((v) => localDate(v.date))
      setSavedDates(dates)
      setSelectedDates(dates)
      setSelectedQuarter(quarter)
      setDirty(false)
    })
  }, [selectedQuarterId])

  useEffect(() => { loadVacation() }, [loadVacation])

  const quarterRange = selectedQuarter?.sprints?.length
    ? {
        from: localDate(selectedQuarter.sprints[0].startDate),
        to: localDate(selectedQuarter.sprints[selectedQuarter.sprints.length - 1].endDate),
      }
    : undefined

  function toggleDate(date: Date) {
    const day = startOfDay(date)
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, day))
      const next = exists ? prev.filter((d) => !isSameDay(d, day)) : [...prev, day]
      setDirty(true)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)

    const toAdd = selectedDates.filter((d) => !savedDates.some((s) => isSameDay(s, d)))
    const toRemove = savedDates.filter((s) => !selectedDates.some((d) => isSameDay(d, s)))

    const promises = []
    if (toAdd.length > 0) {
      promises.push(
        fetch("/api/vacation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quarterId: selectedQuarterId,
            dates: toAdd.map(toDateStr),
          }),
        })
      )
    }
    if (toRemove.length > 0) {
      promises.push(
        fetch("/api/vacation", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quarterId: selectedQuarterId,
            dates: toRemove.map(toDateStr),
          }),
        })
      )
    }

    await Promise.all(promises)
    setSaving(false)
    loadVacation()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Vacation</h1>
          <p className="text-muted-foreground">Select your planned days off for the quarter</p>
          {quarterRange && (
            <p className="text-sm text-muted-foreground">
              {format(quarterRange.from, "MMM d")}–{format(quarterRange.to, "MMM d, yyyy")}
            </p>
          )}
        </div>
        <QuarterSelector quarters={quarters} value={selectedQuarterId} onChange={setSelectedQuarterId} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Calendar picker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="h-4 w-4" /> Select Days Off
            </CardTitle>
            <CardDescription>Click dates to toggle vacation days</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onDayClick={toggleDate}
              fromDate={quarterRange?.from}
              toDate={quarterRange?.to}
              className="rounded-md border p-0"
            />
          </CardContent>
        </Card>

        {/* Selected days list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Selected Days ({selectedDates.length})
            </CardTitle>
            <CardDescription>
              {dirty && <span className="text-amber-600">Unsaved changes</span>}
              {!dirty && "All changes saved"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDates.length === 0 && (
              <p className="text-sm text-muted-foreground">No vacation days selected.</p>
            )}
            {[...selectedDates]
              .sort((a, b) => a.getTime() - b.getTime())
              .map((date) => (
                <div key={date.toISOString()} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                  <span className="text-sm">{format(date, "EEE, MMM d, yyyy")}</span>
                  <button
                    onClick={() => toggleDate(date)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

            {dirty && (
              <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}

            {selectedDates.length > 0 && (
              <div className="pt-2">
                <Badge variant="outline">{selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""} off this quarter</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
