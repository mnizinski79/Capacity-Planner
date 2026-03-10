"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuarterSelector } from "@/components/quarter-selector"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

interface Quarter { id: string; label: string; isActive: boolean; sprints?: { startDate: string; endDate: string }[] }
interface Holiday { id: string; date: string; label: string; quarterId: string; excludesContractors: boolean }

export default function AdminHolidaysPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [newExcludesContractors, setNewExcludesContractors] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editLabel, setEditLabel] = useState("")
  const [editExcludesContractors, setEditExcludesContractors] = useState(false)

  useEffect(() => {
    fetch("/api/quarters").then((r) => r.json()).then((q) => {
      setQuarters(q)
      if (q.length > 0) setSelectedQuarterId((q.find((x: Quarter) => x.isActive) ?? q[0]).id)
    })
  }, [])

  const loadHolidays = () => {
    if (!selectedQuarterId) return
    setLoading(true)
    fetch(`/api/holidays?quarterId=${selectedQuarterId}`)
      .then((r) => r.json())
      .then(setHolidays)
      .finally(() => setLoading(false))
  }

  useEffect(loadHolidays, [selectedQuarterId])

  async function addHoliday() {
    if (!newDate || !newLabel) return
    setAdding(true)
    await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarterId: selectedQuarterId, date: newDate, label: newLabel, excludesContractors: newExcludesContractors }),
    })
    setNewDate("")
    setNewLabel("")
    setNewExcludesContractors(false)
    setAdding(false)
    loadHolidays()
  }

  async function saveEdit(id: string) {
    await fetch(`/api/holidays/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: editDate, label: editLabel, excludesContractors: editExcludesContractors }),
    })
    setEditId(null)
    loadHolidays()
  }

  async function deleteHoliday(id: string) {
    await fetch(`/api/holidays/${id}`, { method: "DELETE" })
    loadHolidays()
  }

  const selectedQuarterObj = quarters.find((q) => q.id === selectedQuarterId)
  const dateRange = selectedQuarterObj?.sprints?.length
    ? `${format(localDate(selectedQuarterObj.sprints[0].startDate), "MMM d")}–${format(localDate(selectedQuarterObj.sprints[selectedQuarterObj.sprints.length - 1].endDate), "MMM d, yyyy")}`
    : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
          <p className="text-muted-foreground">Manage company-wide holidays that reduce team capacity</p>
          {dateRange && <p className="text-sm text-muted-foreground">{dateRange}</p>}
        </div>
        <QuarterSelector quarters={quarters} value={selectedQuarterId} onChange={setSelectedQuarterId} />
      </div>

      {/* Add form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Add Holiday</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Holiday Name</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Memorial Day" onKeyDown={(e) => e.key === "Enter" && addHoliday()} />
            </div>
            <Button onClick={addHoliday} disabled={adding || !newDate || !newLabel}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Checkbox
              id="new-excludes-contractors"
              checked={newExcludesContractors}
              onCheckedChange={(v) => setNewExcludesContractors(v === true)}
            />
            <Label htmlFor="new-excludes-contractors" className="text-sm font-normal cursor-pointer">
              Excludes contractors (contractors don&apos;t get capacity deduction for this holiday)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holidays ({holidays.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && holidays.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No holidays added yet.</p>
          )}
          {holidays.map((h) =>
            editId === h.id ? (
              <div key={h.id} className="rounded-md border px-4 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-7 w-36 text-sm" />
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-7 flex-1 text-sm" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(h.id)}><Check className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-exc-${h.id}`}
                    checked={editExcludesContractors}
                    onCheckedChange={(v) => setEditExcludesContractors(v === true)}
                  />
                  <Label htmlFor={`edit-exc-${h.id}`} className="text-xs font-normal cursor-pointer text-muted-foreground">
                    Excludes contractors
                  </Label>
                </div>
              </div>
            ) : (
              <div key={h.id} className="flex items-center gap-3 rounded-md border px-4 py-2">
                <Badge variant="outline" className="whitespace-nowrap text-xs">
                  {format(localDate(h.date), "EEE, MMM d")}
                </Badge>
                <span className="flex-1 text-sm font-medium">{h.label}</span>
                {h.excludesContractors && (
                  <Badge variant="secondary" className="text-xs">No Contractors</Badge>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(h.id); setEditDate(h.date.slice(0, 10)); setEditLabel(h.label); setEditExcludesContractors(h.excludesContractors) }}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteHoliday(h.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
