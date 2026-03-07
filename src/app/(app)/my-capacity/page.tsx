"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CapacityTable } from "@/components/capacity-table"
import { QuarterSelector } from "@/components/quarter-selector"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

interface Quarter { id: string; label: string; isActive: boolean }
interface Sprint { id: string; label: string; startDate: string; endDate: string }

export default function MyCapacityPage() {
  const { data: session } = useSession()
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [selectedQuarterId, setSelectedQuarterId] = useState("")
  const [data, setData] = useState<{ sprints: Sprint[]; rows: unknown[] } | null>(null)
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
        // filter to only current user
        const myRow = d.rows?.filter((r: { userId: string }) => r.userId === session?.user?.id) ?? []
        setData({ sprints: d.sprints, rows: myRow })
      })
      .finally(() => setLoading(false))
  }, [selectedQuarterId, session])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Capacity</h1>
          <p className="text-muted-foreground">Your sprint-by-sprint capacity for the selected quarter</p>
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

      {!loading && data && (
        <CapacityTable
          sprints={data.sprints}
          rows={data.rows as Parameters<typeof CapacityTable>[0]["rows"]}
          showTotal={false}
        />
      )}

      {!loading && !data && (
        <p className="text-muted-foreground text-sm">Select a quarter to view capacity.</p>
      )}
    </div>
  )
}
