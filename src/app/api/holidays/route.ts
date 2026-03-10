import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const quarterId = searchParams.get("quarterId")

  const holidays = await prisma.holiday.findMany({
    where: quarterId ? { quarterId } : {},
    orderBy: { date: "asc" },
  })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { quarterId, date, label, excludesContractors } = await req.json()
  if (!quarterId || !date || !label) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const holiday = await prisma.holiday.create({
    data: {
      quarterId,
      date: new Date(date + "T00:00:00.000Z"),
      label,
      excludesContractors: excludesContractors === true,
    },
  })
  return NextResponse.json(holiday, { status: 201 })
}
