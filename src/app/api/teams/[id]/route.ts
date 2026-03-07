import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const { name } = await req.json()
  const team = await prisma.team.update({ where: { id }, data: { name } })
  return NextResponse.json(team)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  // Remove team assignment from members before deleting
  await prisma.user.updateMany({ where: { teamId: id }, data: { teamId: null } })
  await prisma.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
