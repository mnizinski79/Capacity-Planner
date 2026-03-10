import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const { date, label, excludesContractors } = await req.json()
  const holiday = await prisma.holiday.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date + "T00:00:00.000Z") }),
      ...(label && { label }),
      ...(excludesContractors !== undefined && { excludesContractors }),
    },
  })
  return NextResponse.json(holiday)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  await prisma.holiday.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
