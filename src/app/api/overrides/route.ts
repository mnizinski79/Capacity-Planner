import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, sprintId, overridePoints } = await req.json()
  if (!userId || !sprintId || overridePoints === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const result = await prisma.capacityOverride.upsert({
    where: { userId_sprintId: { userId, sprintId } },
    create: { userId, sprintId, overridePoints: Number(overridePoints) },
    update: { overridePoints: Number(overridePoints) },
  })
  return NextResponse.json(result, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, sprintId } = await req.json()
  await prisma.capacityOverride.deleteMany({ where: { userId, sprintId } })
  return NextResponse.json({ ok: true })
}
