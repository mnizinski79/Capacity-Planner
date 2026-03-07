"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Edit2, Check, X as XIcon } from "lucide-react"

interface Sprint {
  id: string
  label: string
  startDate: string
  endDate: string
  sprintNumber: number
}

interface Quarter {
  id: string
  label: string
  year: number
  quarterNumber: number
  isActive: boolean
  sprints: Sprint[]
}

// Parse date-only ISO strings (YYYY-MM-DD) in local time to avoid UTC offset shifting the date
function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`
}

function SprintRow({
  sprint,
  onUpdate,
  onDelete,
}: {
  sprint: Sprint
  onUpdate: (id: string, startDate: string, endDate: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(sprint.startDate.slice(0, 10))
  const [end, setEnd] = useState(sprint.endDate.slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(sprint.id, start, end)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-md border px-4 py-2">
      <Badge variant="secondary" className="min-w-[60px] justify-center">{sprint.label}</Badge>
      {editing ? (
        <>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-7 w-36 text-sm" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-7 w-36 text-sm" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={saving}><Check className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><XIcon className="h-3 w-3" /></Button>
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">
            {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}
          </span>
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete ${sprint.label}?`)) onDelete(sprint.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminQuartersPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString())
  const [newQ, setNewQ] = useState("1")
  const [creating, setCreating] = useState(false)

  // New sprint form
  const [addSprintId, setAddSprintId] = useState<string | null>(null)
  const [newSprintStart, setNewSprintStart] = useState("")
  const [newSprintEnd, setNewSprintEnd] = useState("")

  function handleNewSprintStart(value: string) {
    setNewSprintStart(value)
    if (value) {
      const [y, m, d] = value.split("-").map(Number)
      const end = new Date(Date.UTC(y, m - 1, d + 13))
      setNewSprintEnd(end.toISOString().slice(0, 10))
    } else {
      setNewSprintEnd("")
    }
  }

  const load = () => {
    setLoading(true)
    fetch("/api/quarters")
      .then((r) => r.json())
      .then(setQuarters)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function createQuarter() {
    setCreating(true)
    await fetch("/api/quarters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: Number(newYear), quarterNumber: Number(newQ) }),
    })
    setCreating(false)
    setCreateOpen(false)
    load()
  }

  async function deleteQuarter(id: string) {
    await fetch(`/api/quarters/${id}`, { method: "DELETE" })
    load()
  }

  async function toggleActive(q: Quarter) {
    await fetch(`/api/quarters/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !q.isActive }),
    })
    load()
  }

  async function updateSprint(id: string, startDate: string, endDate: string) {
    await fetch(`/api/sprints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    })
    load()
  }

  async function deleteSprint(id: string) {
    await fetch(`/api/sprints/${id}`, { method: "DELETE" })
    load()
  }

  async function addSprint(quarterId: string) {
    if (!newSprintStart || !newSprintEnd) return
    await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quarterId, startDate: newSprintStart, endDate: newSprintEnd }),
    })
    setAddSprintId(null)
    setNewSprintStart("")
    setNewSprintEnd("")
    load()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quarters & Sprints</h1>
          <p className="text-muted-foreground">Manage planning quarters and their sprints</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Quarter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Quarter</DialogTitle>
              <DialogDescription>Creates 6 default sprints automatically</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} type="number" min="2020" max="2030" />
              </div>
              <div className="space-y-2">
                <Label>Quarter</Label>
                <Select value={newQ} onValueChange={setNewQ}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createQuarter} disabled={creating}>
                {creating ? "Creating…" : "Create Quarter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="space-y-4">
        {quarters.map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{q.label}</CardTitle>
                  <Badge variant={q.isActive ? "default" : "secondary"}>
                    {q.isActive ? "Active" : "Archived"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(q)}>
                    {q.isActive ? "Archive" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete ${q.label} and all its sprints?`)) deleteQuarter(q.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardDescription>{q.sprints.length} sprints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.sprints.map((sprint) => (
                <SprintRow
                  key={sprint.id}
                  sprint={sprint}
                  onUpdate={updateSprint}
                  onDelete={deleteSprint}
                />
              ))}

              <Separator className="my-2" />

              {addSprintId === q.id ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-2">
                  <span className="text-sm text-muted-foreground">New sprint:</span>
                  <Input type="date" value={newSprintStart} onChange={(e) => handleNewSprintStart(e.target.value)} className="h-7 w-36 text-sm" />
                  <span className="text-muted-foreground">→</span>
                  <Input type="date" value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} className="h-7 w-36 text-sm" />
                  <Button size="sm" onClick={() => addSprint(q.id)}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddSprintId(null)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setAddSprintId(q.id)}>
                  <Plus className="mr-2 h-3 w-3" /> Add Sprint
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
