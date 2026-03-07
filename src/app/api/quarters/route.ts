import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { addDays, startOfDay, addWeeks } from "date-fns"

function nextWeekday(date: Date): Date {
  let d = startOfDay(date)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d = addDays(d, 1)
  }
  return d
}

function quarterStartDate(year: number, q: number): Date {
  const month = (q - 1) * 3
  return new Date(year, month, 1)
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const quarters = await prisma.quarter.findMany({
    include: { sprints: { orderBy: { sprintNumber: "asc" } } },
    orderBy: [{ year: "desc" }, { quarterNumber: "desc" }],
  })
  return NextResponse.json(quarters)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { year, quarterNumber } = await req.json()

  if (!year || !quarterNumber || quarterNumber < 1 || quarterNumber > 4) {
    return NextResponse.json({ error: "Invalid quarter data" }, { status: 400 })
  }

  const existing = await prisma.quarter.findUnique({ where: { year_quarterNumber: { year, quarterNumber } } })
  if (existing) {
    return NextResponse.json({ error: "Quarter already exists" }, { status: 409 })
  }

  const label = `${year} Q${quarterNumber}`
  const qStart = nextWeekday(quarterStartDate(year, quarterNumber))

  const quarter = await prisma.quarter.create({
    data: {
      year,
      quarterNumber,
      label,
      sprints: {
        create: Array.from({ length: 6 }, (_, i) => {
          const sprintStart = addWeeks(qStart, i * 2)
          const sprintEnd = addDays(sprintStart, 13)
          return {
            sprintNumber: i + 1,
            label: `Q${quarterNumber}.${i + 1}`,
            startDate: startOfDay(sprintStart),
            endDate: startOfDay(sprintEnd),
          }
        }),
      },
    },
    include: { sprints: { orderBy: { sprintNumber: "asc" } } },
  })

  return NextResponse.json(quarter, { status: 201 })
}
