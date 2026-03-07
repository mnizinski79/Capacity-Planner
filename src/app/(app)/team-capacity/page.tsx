"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CapacityTable } from "@/components/capacity-table"
import { QuarterSelector } from "@/components/quarter-selector"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Printer } from "lucide-react"

interface Quarter { id: string; label: string; isActive: boolean }
interface Team { id: string; name: string }
interface Sprint { id: string; label: string; startDate: string; endDate: string }
interface Row { userId: string; teamId: string | null; [k: string]: unknown }

const ALL_TEAMS = "__all__"

export default function TeamCapacityPage() {
  const { data: session } = useSession()
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [allRows, setAllRows] = useState<Row[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)

  // Load quarters and teams once
  useEffect(() => {
    fetch("/api/quarters").then((r) => r.json()).then((q) => {
      setQuarters(q)
      if (q.length > 0) setSelectedQuarterId((q.find((x: Quarter) => x.isActive) ?? q[0]).id)
    })
    fetch("/api/teams").then((r) => r.json()).then(setTeams)
  }, [])

  // Default selected team to the user's own team once we have session + rows
  useEffect(() => {
    if (!session || allRows.length === 0 || selectedTeamId) return
    const myTeamId = allRows.find((r) => r.userId === session.user?.id)?.teamId
    setSelectedTeamId(myTeamId ?? ALL_TEAMS)
  }, [session, allRows, selectedTeamId])

  // Fetch capacity data whenever quarter changes
  useEffect(() => {
    if (!selectedQuarterId) return
    setLoading(true)
    fetch(`/api/capacity?quarterId=${selectedQuarterId}`)
      .then((r) => r.json())
      .then((d) => {
        setAllRows(d.rows ?? [])
        setSprints(d.sprints ?? [])
      })
      .finally(() => setLoading(false))
  }, [selectedQuarterId])

  // Filter rows based on selected team
  const visibleRows =
    selectedTeamId === ALL_TEAMS || !selectedTeamId
      ? allRows
      : allRows.filter((r) => r.teamId === selectedTeamId)

  const selectedTeamName =
    selectedTeamId === ALL_TEAMS
      ? "All Teams"
      : teams.find((t) => t.id === selectedTeamId)?.name ?? "My Team"

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Capacity</h1>
          <p className="text-muted-foreground">
            Sprint capacity for{" "}
            <span className="font-medium text-foreground">{selectedTeamName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {/* Team selector */}
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>All Teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <QuarterSelector quarters={quarters} value={selectedQuarterId} onChange={setSelectedQuarterId} />

          {selectedQuarterId && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/export?quarterId=${selectedQuarterId}`} download>
                  <Download className="mr-1 h-3 w-3" /> CSV
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-3 w-3" /> Print
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!loading && sprints.length > 0 && (
        <CapacityTable
          sprints={sprints}
          rows={visibleRows as unknown as Parameters<typeof CapacityTable>[0]["rows"]}
          showTotal
          showTeamColumn={false}
        />
      )}
    </div>
  )
}
