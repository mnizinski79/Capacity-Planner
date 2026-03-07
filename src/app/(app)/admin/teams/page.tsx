"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"

interface User { id: string; name: string; email: string; baseCapacity: number }
interface Team { id: string; name: string; members: User[] }

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/teams").then((r) => r.json()).then(setTeams).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function createTeam() {
    if (!newName.trim()) return
    setCreating(true)
    await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName("")
    setCreating(false)
    load()
  }

  async function saveEdit(id: string) {
    await fetch(`/api/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    })
    setEditId(null)
    load()
  }

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Delete team "${name}"? Members will be unassigned.`)) return
    await fetch(`/api/teams/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground">Create and manage teams. Assign users via the Users page.</p>
      </div>

      {/* Create team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Frontend, Platform, QA"
                onKeyDown={(e) => e.key === "Enter" && createTeam()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createTeam} disabled={creating || !newName.trim()}>
                <Plus className="mr-2 h-4 w-4" /> Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams list */}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                {editId === team.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 max-w-xs"
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(team.id)}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(team.id)}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <CardTitle className="text-base">{team.name}</CardTitle>
                )}
                {editId !== team.id && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditId(team.id); setEditName(team.name) }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteTeam(team.id, team.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No members yet. Assign via the Users page.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {team.members.map((m) => (
                    <Badge key={m.id} variant="outline">
                      {m.name} <span className="ml-1 text-xs text-muted-foreground">({m.baseCapacity} pts)</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
