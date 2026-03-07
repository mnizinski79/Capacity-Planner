"use client"

import React from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Sprint {
  id: string
  label: string
  startDate: string
  endDate: string
}

interface SprintResult {
  sprintId: string
  label: string
  baseCapacity: number
  workingDays: number
  holidayDays: number
  vacationDays: number
  deductionPoints: number
  netCapacity: number
  isOverride: boolean
}

interface CapacityRow {
  userId: string
  userName: string
  teamId: string | null
  teamName: string | null
  baseCapacity: number
  sprints: Record<string, SprintResult>
  quarterTotal: number
}

interface CapacityTableProps {
  sprints: Sprint[]
  rows: CapacityRow[]
  groupByTeam?: boolean
  showTotal?: boolean
  totalLabel?: string
  showTeamColumn?: boolean
}

function fmtDate(d: string) {
  const [, m, day] = d.slice(0, 10).split("-")
  return `${m}/${day}`
}

function CapacityCell({ result, base }: { result: SprintResult; base: number }) {
  const pct = base > 0 ? Math.round((result.netCapacity / base) * 100) : 100
  const low = pct < 60

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "cursor-default rounded px-2 py-1 text-center text-sm font-medium tabular-nums",
            result.isOverride
              ? "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400"
              : low
              ? "bg-red-50 text-red-700"
              : "bg-background"
          )}
        >
          {result.netCapacity}
          {result.isOverride && <span className="ml-1 text-xs text-yellow-600">*</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs space-y-1 p-3 max-w-48">
        <p className="font-semibold">{result.label}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-muted-foreground">Base:</span>
          <span>{result.baseCapacity} pts</span>
          <span className="text-muted-foreground">Working days:</span>
          <span>{result.workingDays}</span>
          <span className="text-muted-foreground">Holidays:</span>
          <span>{result.holidayDays} day{result.holidayDays !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground">Vacation:</span>
          <span>{result.vacationDays} day{result.vacationDays !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground">Deducted:</span>
          <span>−{result.deductionPoints} pts</span>
          <span className="font-semibold">Net:</span>
          <span className="font-semibold">{result.netCapacity} pts</span>
        </div>
        {result.isOverride && <p className="text-yellow-600 text-xs">* Manual override</p>}
      </TooltipContent>
    </Tooltip>
  )
}

function UserRow({ row, sprints, showTeamColumn }: { row: CapacityRow; sprints: Sprint[]; showTeamColumn: boolean }) {
  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2 text-sm font-medium whitespace-nowrap">{row.userName}</td>
      {showTeamColumn && (
        <td className="px-4 py-2 text-sm text-muted-foreground whitespace-nowrap">
          {row.teamName ?? <span className="italic">No team</span>}
        </td>
      )}
      <td className="px-4 py-2 text-sm text-center text-muted-foreground">{row.baseCapacity}</td>
      {sprints.map((sprint) => {
        const result = row.sprints[sprint.id]
        if (!result) {
          return (
            <td key={sprint.id} className="px-2 py-2 text-center">
              <span className="text-xs text-muted-foreground">—</span>
            </td>
          )
        }
        return (
          <td key={sprint.id} className="px-2 py-2">
            <CapacityCell result={result} base={row.baseCapacity} />
          </td>
        )
      })}
      <td className="px-4 py-2 text-sm font-semibold text-center">{row.quarterTotal}</td>
    </tr>
  )
}

function TeamTotalRow({
  teamRows,
  teamName,
  sprints,
  showTeamColumn,
}: {
  teamRows: CapacityRow[]
  teamName: string | null
  sprints: Sprint[]
  showTeamColumn: boolean
}) {
  let grandTotal = 0
  const sprintTotals: Record<string, number> = {}
  for (const sprint of sprints) {
    sprintTotals[sprint.id] = teamRows.reduce(
      (sum, r) => sum + (r.sprints[sprint.id]?.netCapacity ?? 0),
      0
    )
    grandTotal += sprintTotals[sprint.id]
  }

  return (
    <tr className="border-b bg-muted/40 font-semibold">
      <td className="px-4 py-2 text-sm" colSpan={showTeamColumn ? 2 : 1}>
        {teamName ? `${teamName} Total` : "No Team Total"}
      </td>
      <td className="px-4 py-2 text-sm text-center text-muted-foreground">—</td>
      {sprints.map((sprint) => (
        <td key={sprint.id} className="px-2 py-2 text-center text-sm">
          {sprintTotals[sprint.id]}
        </td>
      ))}
      <td className="px-4 py-2 text-sm text-center">{grandTotal}</td>
    </tr>
  )
}

function GrandTotalRow({ rows, sprints, label = "All Teams Total", showTeamColumn }: { rows: CapacityRow[]; sprints: Sprint[]; label?: string; showTeamColumn: boolean }) {
  let grandTotal = 0
  const sprintTotals: Record<string, number> = {}
  for (const sprint of sprints) {
    sprintTotals[sprint.id] = rows.reduce(
      (sum, r) => sum + (r.sprints[sprint.id]?.netCapacity ?? 0),
      0
    )
    grandTotal += sprintTotals[sprint.id]
  }

  return (
    <tr className="border-t-2 bg-primary/5 font-bold">
      <td className="px-4 py-2 text-sm" colSpan={showTeamColumn ? 2 : 1}>{label}</td>
      <td className="px-4 py-2 text-sm text-center text-muted-foreground">—</td>
      {sprints.map((sprint) => (
        <td key={sprint.id} className="px-2 py-2 text-center text-sm">
          {sprintTotals[sprint.id]}
        </td>
      ))}
      <td className="px-4 py-2 text-sm text-center">{grandTotal}</td>
    </tr>
  )
}

export function CapacityTable({
  sprints,
  rows,
  groupByTeam = false,
  showTotal = true,
  totalLabel,
  showTeamColumn = true,
}: CapacityTableProps) {
  if (sprints.length === 0 || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data available
      </div>
    )
  }

  // Build team groups
  type TeamGroup = { teamName: string | null; teamId: string | null; rows: CapacityRow[] }
  const teamGroups: TeamGroup[] = []
  if (groupByTeam) {
    const teamMap = new Map<string, TeamGroup>()
    for (const row of rows) {
      const key = row.teamId ?? "__none__"
      if (!teamMap.has(key)) {
        teamMap.set(key, { teamName: row.teamName, teamId: row.teamId, rows: [] })
      }
      teamMap.get(key)!.rows.push(row)
    }
    teamGroups.push(...teamMap.values())
  }

  return (
    <div className="overflow-x-auto rounded-md border print:border-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Name</th>
            {showTeamColumn && <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Team</th>}
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Base (pts)</th>
            {sprints.map((sprint) => (
              <th
                key={sprint.id}
                className="px-2 py-3 text-center font-semibold whitespace-nowrap min-w-[100px]"
              >
                <div>{sprint.label}</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {fmtDate(sprint.startDate)}–{fmtDate(sprint.endDate)}
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Q Total</th>
          </tr>
        </thead>
        <tbody>
          {groupByTeam
            ? teamGroups.flatMap((team) => [
                ...team.rows.map((row) => (
                  <UserRow key={row.userId} row={row} sprints={sprints} showTeamColumn={showTeamColumn} />
                )),
                <TeamTotalRow
                  key={`total-${team.teamId ?? "__none__"}`}
                  teamRows={team.rows}
                  teamName={team.teamName}
                  sprints={sprints}
                  showTeamColumn={showTeamColumn}
                />,
              ])
            : rows.map((row) => (
                <UserRow key={row.userId} row={row} sprints={sprints} showTeamColumn={showTeamColumn} />
              ))}
        </tbody>
        {showTotal && rows.length > 1 && (
          <tfoot>
            <GrandTotalRow rows={rows} sprints={sprints} label={totalLabel} showTeamColumn={showTeamColumn} />
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function TeamSummaryBadges({ sprints, rows }: { sprints: Sprint[]; rows: CapacityRow[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {sprints.map((sprint) => {
        const total = rows.reduce(
          (sum, r) => sum + (r.sprints[sprint.id]?.netCapacity ?? 0),
          0
        )
        return (
          <Badge key={sprint.id} variant="outline" className="text-xs">
            {sprint.label}: <span className="font-semibold ml-1">{total} pts</span>
          </Badge>
        )
      })}
    </div>
  )
}
