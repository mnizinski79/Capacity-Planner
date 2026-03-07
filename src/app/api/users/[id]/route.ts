import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  if (session.user.role !== "admin" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, baseCapacity: true, teamId: true, team: true },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const { name, email, password, role, baseCapacity, teamId } = await req.json()

  // Check email uniqueness if being changed
  if (email !== undefined) {
    const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      ...(role !== undefined && { role }),
      ...(baseCapacity !== undefined && { baseCapacity: Number(baseCapacity) }),
      ...(teamId !== undefined && { teamId: teamId || null }),
    },
    select: { id: true, name: true, email: true, role: true, baseCapacity: true, teamId: true, team: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
