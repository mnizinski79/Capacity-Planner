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

  const [quarter, users, overrides] = await Promise.all([
    prisma.quarter.findUnique({
      where: { id: quarterId },
      include: {
        sprints: { orderBy: { sprintNumber: "asc" } },
        holidays: true,
      },
    }),
    prisma.user.findMany({
      include: { team: true },
      orderBy: { name: "asc" },
    }),
    prisma.capacityOverride.findMany({
      where: { sprint: { quarterId } },
    }),

  ])

  if (!quarter) return NextResponse.json({ error: "Quarter not found" }, { status: 404 })

  const vacationDays = await prisma.vacationDay.findMany({
    where: { quarterId },
  })

  const rows = users.map((user) => {
    const userVacation = vacationDays.filter((v) => v.userId === user.id).map((v) => v.date)
    const holidayDates = quarter.holidays
      .filter((h) => !h.excludesContractors || !user.isContractor)
      .map((h) => h.date)

    const sprintResults: Record<string, {
      sprintId: string
      label: string
      baseCapacity: number
      workingDays: number
      holidayDays: number
      vacationDays: number
      deductionPoints: number
      netCapacity: number
      isOverride: boolean
    }> = {}

    let quarterTotal = 0

    for (const sprint of quarter.sprints) {
      const override = overrides.find(
        (o) => o.userId === user.id && o.sprintId === sprint.id
      )

      const result = calculateNetCapacity(
        user.baseCapacity,
        sprint.startDate,
        sprint.endDate,
        holidayDates,
        userVacation,
        override?.overridePoints
      )

      sprintResults[sprint.id] = {
        sprintId: sprint.id,
        label: sprint.label,
        ...result,
      }
      quarterTotal += result.netCapacity
    }

    return {
      userId: user.id,
      userName: user.name,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      baseCapacity: user.baseCapacity,
      sprints: sprintResults,
      quarterTotal,
    }
  })

  return NextResponse.json({
    quarter,
    sprints: quarter.sprints,
    rows,
  })
}
