import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const teams = await prisma.team.findMany({
    include: { members: { select: { id: true, name: true, email: true, role: true, baseCapacity: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(teams)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const team = await prisma.team.create({ data: { name }, include: { members: true } })
  return NextResponse.json(team, { status: 201 })
}
