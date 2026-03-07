import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const { startDate, endDate } = await req.json()
  const sprint = await prisma.sprint.update({
    where: { id },
    data: {
      ...(startDate && { startDate: new Date(startDate + "T00:00:00.000Z") }),
      ...(endDate && { endDate: new Date(endDate + "T00:00:00.000Z") }),
    },
  })
  return NextResponse.json(sprint)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.sprint.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
