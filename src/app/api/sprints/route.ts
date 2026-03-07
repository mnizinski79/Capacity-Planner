import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { quarterId, startDate, endDate } = await req.json()
  if (!quarterId || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const quarter = await prisma.quarter.findUnique({ where: { id: quarterId }, include: { sprints: true } })
  if (!quarter) return NextResponse.json({ error: "Quarter not found" }, { status: 404 })

  const nextNumber = (quarter.sprints.length > 0 ? Math.max(...quarter.sprints.map((s) => s.sprintNumber)) : 0) + 1
  const label = `Q${quarter.quarterNumber}.${nextNumber}`

  const sprint = await prisma.sprint.create({
    data: {
      quarterId,
      sprintNumber: nextNumber,
      label,
      startDate: new Date(startDate + "T00:00:00.000Z"),
      endDate: new Date(endDate + "T00:00:00.000Z"),
    },
  })

  return NextResponse.json(sprint, { status: 201 })
}
