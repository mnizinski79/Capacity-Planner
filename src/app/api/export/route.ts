import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateNetCapacity } from "@/lib/capacity"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const quarterId = searchParams.get("quarterId")
  if (!quarterId) return NextResponse.json({ error: "quarterId required" }, { status: 400 })

  const [quarter, users, overrides, vacationDays] = await Promise.all([
    prisma.quarter.findUnique({
      where: { id: quarterId },
      include: {
        sprints: { orderBy: { sprintNumber: "asc" } },
        holidays: true,
      },
    }),
    prisma.user.findMany({ include: { team: true }, orderBy: { name: "asc" } }),
    prisma.capacityOverride.findMany({ where: { sprint: { quarterId } } }),
    prisma.vacationDay.findMany({ where: { quarterId } }),
  ])

  if (!quarter) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const holidayDates = quarter.holidays.map((h) => h.date)
  const sprints = quarter.sprints

  // Build CSV header
  const headers = ["User", "Team", "Base Capacity", ...sprints.map((s) => `${s.label} (${fmtDate(s.startDate)}-${fmtDate(s.endDate)})`), "Quarter Total"]

  const csvRows: string[][] = [headers]

  for (const user of users) {
    const userVacation = vacationDays.filter((v) => v.userId === user.id).map((v) => v.date)
    let total = 0
    const sprintCols = sprints.map((sprint) => {
      const override = overrides.find((o) => o.userId === user.id && o.sprintId === sprint.id)
      const result = calculateNetCapacity(user.baseCapacity, sprint.startDate, sprint.endDate, holidayDates, userVacation, override?.overridePoints)
      total += result.netCapacity
      return String(result.netCapacity)
    })
    csvRows.push([user.name, user.team?.name ?? "No Team", String(user.baseCapacity), ...sprintCols, String(total)])
  }

  const csv = csvRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="capacity-${quarter.label.replace(/\s/g, "-")}.csv"`,
    },
  })
}

function fmtDate(d: Date): string {
  const dt = new Date(d)
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`
}
