import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, email, password, role, isTeamLead, isContractor, baseCapacity, teamId } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role === "admin" ? "admin" : "user",
      isTeamLead: isTeamLead === true,
      isContractor: isContractor === true,
      baseCapacity: baseCapacity ? Number(baseCapacity) : 16,
      teamId: teamId || null,
    },
    select: { id: true, name: true, email: true, role: true, isTeamLead: true, isContractor: true, baseCapacity: true, teamId: true, team: { select: { id: true, name: true } } },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isTeamLead: true,
      isContractor: true,
      baseCapacity: true,
      teamId: true,
      team: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(users)
}
