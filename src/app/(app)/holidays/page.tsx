"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { QuarterSelector } from "@/components/quarter-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"

function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

interface Quarter { id: string; label: string; isActive: boolean }
interface Holiday { id: string; date: string; label: string; quarterId: string }

export default function HolidaysPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/quarters").then((r) => r.json()).then((q) => {
      setQuarters(q)
      if (q.length > 0) setSelectedQuarterId((q.find((x: Quarter) => x.isActive) ?? q[0]).id)
    })
  }, [])

  useEffect(() => {
    if (!selectedQuarterId) return
    setLoading(true)
    fetch(`/api/holidays?quarterId=${selectedQuarterId}`)
      .then((r) => r.json())
      .then(setHolidays)
      .finally(() => setLoading(false))
  }, [selectedQuarterId])

  // Group by month
  const byMonth = holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const month = format(localDate(h.date), "MMMM yyyy")
    if (!acc[month]) acc[month] = []
    acc[month].push(h)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
          <p className="text-muted-foreground">Company holidays for the selected quarter</p>
        </div>
        <QuarterSelector quarters={quarters} value={selectedQuarterId} onChange={setSelectedQuarterId} />
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!loading && holidays.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No holidays defined for this quarter.
          </CardContent>
        </Card>
      )}

      {!loading && Object.entries(byMonth).map(([month, monthHolidays]) => (
        <Card key={month}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {month}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-md border px-4 py-2">
                <span className="text-sm font-medium">{h.label}</span>
                <Badge variant="outline" className="text-xs">
                  {format(localDate(h.date), "EEE, MMM d")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
