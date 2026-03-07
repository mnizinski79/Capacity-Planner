import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const quarterId = searchParams.get("quarterId")
  const userId = searchParams.get("userId")

  // When no userId param is provided, always show current user's own vacation.
  // Admins can pass ?userId=X to view another user's vacation (used by admin pages).
  const filterUserId =
    session.user.role === "admin" && userId ? userId : session.user.id

  const vacation = await prisma.vacationDay.findMany({
    where: {
      ...(quarterId && { quarterId }),
      ...(filterUserId && { userId: filterUserId }),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "asc" },
  })
  return NextResponse.json(vacation)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { quarterId, dates } = await req.json()
  if (!quarterId || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const userId = session.user.id

  // Upsert each date
  const results = await Promise.all(
    dates.map((date: string) =>
      prisma.vacationDay.upsert({
        where: { userId_date: { userId, date: new Date(date + "T00:00:00.000Z") } },
        create: { userId, quarterId, date: new Date(date + "T00:00:00.000Z") },
        update: {},
      })
    )
  )

  return NextResponse.json(results, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { dates, quarterId } = await req.json()
  const userId = session.user.id

  await Promise.all(
    dates.map((d: string) =>
      prisma.vacationDay.deleteMany({
        where: {
          userId,
          date: new Date(d + "T00:00:00.000Z"),
        },
      })
    )
  )
  return NextResponse.json({ ok: true })
}
