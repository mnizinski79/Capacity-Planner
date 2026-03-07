import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const quarter = await prisma.quarter.findUnique({
    where: { id },
    include: {
      sprints: { orderBy: { sprintNumber: "asc" } },
      holidays: { orderBy: { date: "asc" } },
    },
  })
  if (!quarter) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(quarter)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const data = await req.json()
  const quarter = await prisma.quarter.update({ where: { id }, data: { isActive: data.isActive } })
  return NextResponse.json(quarter)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.quarter.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
