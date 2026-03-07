"use client"

import { useEffect, useState } from "react"
import { CapacityTable } from "@/components/capacity-table"
import { QuarterSelector } from "@/components/quarter-selector"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

interface Quarter { id: string; label: string; isActive: boolean }
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

function groupByTeam(rows: CapacityRow[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>()
  for (const row of rows) {
    const key = row.teamId ?? "__none__"
    if (!map.has(key)) {
      map.set(key, { teamId: row.teamId, teamName: row.teamName, rows: [] })
    }
    map.get(key)!.rows.push(row)
  }
  return [...map.values()]
}

export default function AllCapacityPage() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [allRows, setAllRows] = useState<CapacityRow[]>([])
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
    fetch(`/api/capacity?quarterId=${selectedQuarterId}`)
      .then((r) => r.json())
      .then((d) => {
        setSprints(d.sprints ?? [])
        setAllRows(d.rows ?? [])
      })
      .finally(() => setLoading(false))
  }, [selectedQuarterId])

  const teamGroups = groupByTeam(allRows)

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Capacity</h1>
          <p className="text-muted-foreground">Capacity for all individuals and teams across the quarter</p>
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

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!loading && sprints.length > 0 && (
        <div className="space-y-8">
          {teamGroups.map((group) => (
            <div key={group.teamId ?? "__none__"} className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                {group.teamName ?? "No Team"}
              </h2>
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
    </div>
  )
}
