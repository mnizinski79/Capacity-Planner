"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit2, Trash2, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { PasswordInput } from "@/components/password-input"

interface Team { id: string; name: string }
interface User {
  id: string
  name: string
  email: string
  role: string
  isTeamLead: boolean
  isContractor: boolean
  baseCapacity: number
  teamId: string | null
  team: { id: string; name: string } | null
}

function UserRow({
  user,
  teams,
  onSave,
  onDelete,
}: {
  user: User
  teams: Team[]
  onSave: (id: string, data: Partial<User> & { password?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(user.role)
  const [isTeamLead, setIsTeamLead] = useState(user.isTeamLead)
  const [isContractor, setIsContractor] = useState(user.isContractor)
  const [base, setBase] = useState(String(user.baseCapacity))
  const [teamId, setTeamId] = useState(user.teamId ?? "__none__")
  const [saving, setSaving] = useState(false)

  function openDialog() {
    setName(user.name)
    setEmail(user.email)
    setPassword("")
    setRole(user.role)
    setIsTeamLead(user.isTeamLead)
    setIsContractor(user.isContractor)
    setBase(String(user.baseCapacity))
    setTeamId(user.teamId ?? "__none__")
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    await onSave(user.id, {
      name,
      email,
      ...(password ? { password } : {}),
      role,
      isTeamLead,
      isContractor,
      baseCapacity: Number(base),
      teamId: teamId === "__none__" ? null : teamId,
    })
    setSaving(false)
    setOpen(false)
    setPassword("")
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
            {user.isTeamLead && <Badge variant="outline">Team Lead</Badge>}
            {user.isContractor && <Badge variant="outline">Contractor</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-center">{user.baseCapacity} pts</TableCell>
        <TableCell>{user.team?.name ?? <span className="italic text-muted-foreground">No team</span>}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openDialog}><Edit2 className="h-3 w-3" /></Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => { if (confirm(`Delete ${user.name}?`)) onDelete(user.id) }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Base Capacity (pts)</Label>
                <Input type="number" value={base} onChange={(e) => setBase(e.target.value)} min="0" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="edit-team-lead" checked={isTeamLead} onCheckedChange={(v) => setIsTeamLead(v === true)} />
                <Label htmlFor="edit-team-lead">Team Lead</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-contractor" checked={isContractor} onCheckedChange={(v) => setIsContractor(v === true)} />
                <Label htmlFor="edit-contractor">Contractor</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  // Add user dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("user")
  const [newIsTeamLead, setNewIsTeamLead] = useState(false)
  const [newIsContractor, setNewIsContractor] = useState(false)
  const [newBase, setNewBase] = useState("16")
  const [newTeamId, setNewTeamId] = useState("__none__")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ]).then(([u, t]) => {
      setUsers(u)
      setTeams(t)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function saveUser(id: string, data: Partial<User>) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    load()
  }

  async function deleteUser(id: string) {
    await fetch(`/api/users/${id}`, { method: "DELETE" })
    load()
  }

  async function addUser() {
    setAddError("")
    setAdding(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        isTeamLead: newIsTeamLead,
        isContractor: newIsContractor,
        baseCapacity: Number(newBase),
        teamId: newTeamId === "__none__" ? null : newTeamId,
      }),
    })
    setAdding(false)
    if (!res.ok) {
      const err = await res.json()
      setAddError(err.error ?? "Failed to create user")
      return
    }
    setAddOpen(false)
    setNewName(""); setNewEmail(""); setNewPassword("")
    setNewRole("user"); setNewIsTeamLead(false); setNewIsContractor(false)
    setNewBase("16"); setNewTeamId("__none__")
    load()
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user roles, base capacity, and team assignments</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); setAddError("") }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Temporary password" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Base Capacity (pts)</Label>
                  <Input type="number" value={newBase} onChange={(e) => setNewBase(e.target.value)} min="0" />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="add-team-lead" checked={newIsTeamLead} onCheckedChange={(v) => setNewIsTeamLead(v === true)} />
                  <Label htmlFor="add-team-lead">Team Lead</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="add-contractor" checked={newIsContractor} onCheckedChange={(v) => setNewIsContractor(v === true)} />
                  <Label htmlFor="add-contractor">Contractor</Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Team</Label>
                <Select value={newTeamId} onValueChange={setNewTeamId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Team</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
            <DialogFooter>
              <Button onClick={addUser} disabled={adding}>
                {adding ? "Adding…" : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users ({users.length})</CardTitle>
          <CardDescription>Click the edit icon to modify a user</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Base Capacity</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} teams={teams} onSave={saveUser} onDelete={deleteUser} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
