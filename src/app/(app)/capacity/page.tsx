"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CapacityTable } from "@/components/capacity-table"
import { QuarterSelector } from "@/components/quarter-selector"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Download, Printer } from "lucide-react"

type View = "mine" | "team" | "all"

interface Quarter { id: string; label: string; status: "ACTIVE" | "UPCOMING" | "ARCHIVED" }
interface Team { id: string; name: string }
interface Sprint { id: string; label: string; startDate: string; endDate: string }
interface CapacityRow {
  userId: string
  userName: string
  teamId: string | null
  teamName: string | null
  baseCapacity: number
  sprints: Record<string, unknown>
  quarterTotal: number
}

type TeamGroup = { teamId: string | null; teamName: string | null; rows: CapacityRow[] }

const ALL_TEAMS = "__all__"
const STORAGE_KEY_VIEW = "capacity_view"
const STORAGE_KEY_TEAM = "capacity_team"

function groupByTeam(rows: CapacityRow[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>()
  for (const row of rows) {
    const key = row.teamId ?? "__none__"
    if (!map.has(key)) map.set(key, { teamId: row.teamId, teamName: row.teamName, rows: [] })
    map.get(key)!.rows.push(row)
  }
  return [...map.values()]
}

export default function CapacityPage() {
  const { data: session } = useSession()
  const [view, setView] = useState<View>("mine")
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState(ALL_TEAMS)
  const [allRows, setAllRows] = useState<CapacityRow[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)

  // Restore last-used view and team from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem(STORAGE_KEY_VIEW) as View | null
    const savedTeam = localStorage.getItem(STORAGE_KEY_TEAM)
    if (savedView && ["mine", "team", "all"].includes(savedView)) setView(savedView)
    if (savedTeam) setSelectedTeamId(savedTeam)
  }, [])

  // Load quarters and teams once
  useEffect(() => {
    fetch("/api/quarters").then((r) => r.json()).then((q) => {
      setQuarters(q)
      if (q.length > 0) setSelectedQuarterId(
        (q.find((x: Quarter) => x.status === "ACTIVE") ?? q.find((x: Quarter) => x.status === "UPCOMING") ?? q[0]).id
      )
    })
    fetch("/api/teams").then((r) => r.json()).then(setTeams)
  }, [])

  // Default team to user's own team once we have data (only if no saved preference)
  useEffect(() => {
    if (!session || allRows.length === 0) return
    if (localStorage.getItem(STORAGE_KEY_TEAM)) return
    const myTeamId = allRows.find((r) => r.userId === session.user?.id)?.teamId
    if (myTeamId) {
      setSelectedTeamId(myTeamId)
      localStorage.setItem(STORAGE_KEY_TEAM, myTeamId)
    }
  }, [session, allRows])

  // Fetch capacity data when quarter changes
  useEffect(() => {
    if (!selectedQuarterId) return
    setLoading(true)
    fetch(`/api/capacity?quarterId=${selectedQuarterId}`)
      .then((r) => r.json())
      .then((d) => {
        setSprints(d.sprints ?? [])
        setAllRows(d.rows ?? [])
      })
      .finally(() => setLoading(false))
  }, [selectedQuarterId])

  function changeView(v: View) {
    setView(v)
    localStorage.setItem(STORAGE_KEY_VIEW, v)
  }

  function changeTeam(teamId: string) {
    setSelectedTeamId(teamId)
    localStorage.setItem(STORAGE_KEY_TEAM, teamId)
  }

  const myRows = allRows.filter((r) => r.userId === session?.user?.id)
  const teamRows = selectedTeamId === ALL_TEAMS || !selectedTeamId
    ? allRows
    : allRows.filter((r) => r.teamId === selectedTeamId)
  const teamGroups = groupByTeam(allRows)

  const selectedTeamName = selectedTeamId === ALL_TEAMS
    ? "All"
    : teams.find((t) => t.id === selectedTeamId)?.name ?? "My Team"

  const subtitles: Record<View, string> = {
    mine: "Your sprint-by-sprint capacity for the selected quarter",
    team: `Sprint capacity for ${selectedTeamName}`,
    all: "Capacity for all individuals and teams across the quarter",
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Capacity</h1>
          <p className="text-muted-foreground">{subtitles[view]}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
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

      {/* View switcher */}
      <div className="flex items-center gap-3 print:hidden">
        <div className="inline-flex items-center rounded-lg border bg-muted p-1 gap-1">
          {(["mine", "team", "all"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "mine" ? "Mine" : v === "team" ? "Team" : "All Teams"}
            </button>
          ))}
        </div>

        {view === "team" && (
          <Select value={selectedTeamId} onValueChange={changeTeam}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>All</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* Mine view */}
      {!loading && view === "mine" && (
        myRows.length > 0
          ? <CapacityTable sprints={sprints} rows={myRows as Parameters<typeof CapacityTable>[0]["rows"]} showTotal={false} />
          : sprints.length > 0 && <p className="text-muted-foreground text-sm">No capacity data found for your account.</p>
      )}

      {/* Team view */}
      {!loading && view === "team" && sprints.length > 0 && (
        <CapacityTable
          sprints={sprints}
          rows={teamRows as Parameters<typeof CapacityTable>[0]["rows"]}
          showTotal
          showTeamColumn={false}
        />
      )}

      {/* All Teams view */}
      {!loading && view === "all" && sprints.length > 0 && (
        <div className="space-y-8">
          {teamGroups.map((group) => (
            <div key={group.teamId ?? "__none__"} className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{group.teamName ?? "No Team"}</h2>
              <CapacityTable
                sprints={sprints}
                rows={group.rows as Parameters<typeof CapacityTable>[0]["rows"]}
                showTotal
                totalLabel={`${group.teamName ?? "No Team"} Total`}
                showTeamColumn={false}
              />
            </div>
          ))}
          {teamGroups.length > 1 && (
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">All Teams</h2>
              <CapacityTable
                sprints={sprints}
                rows={allRows as Parameters<typeof CapacityTable>[0]["rows"]}
                showTotal
                showTeamColumn={false}
              />
            </div>
          )}
        </div>
      )}

      {!loading && !sprints.length && (
        <p className="text-muted-foreground text-sm">Select a quarter to view capacity.</p>
      )}
    </div>
  )
}
