import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendVacationChangeNotification } from "@/lib/email"
import { format } from "date-fns"

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

  // Fire-and-forget notification — never blocks response
  notifyTeamLead(userId, quarterId, dates, "added").catch(console.error)

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

  // Fire-and-forget notification — never blocks response
  notifyTeamLead(userId, quarterId, dates, "removed").catch(console.error)

  return NextResponse.json({ ok: true })
}

// ---------------------------------------------------------------------------
// Notification helper — loads context and fires the email
// ---------------------------------------------------------------------------
async function notifyTeamLead(
  userId: string,
  quarterId: string,
  dates: string[],
  action: "added" | "removed"
): Promise<void> {
  // 1. Load the user with their team
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, teamId: true, team: { select: { name: true } } },
  })
  if (!user?.teamId || !user.team) return

  // 2. Find team leads — exclude the changer so they don't email themselves
  const teamLeads = await prisma.user.findMany({
    where: { teamId: user.teamId, isTeamLead: true, NOT: { id: userId } },
    select: { email: true },
  })
  if (teamLeads.length === 0) return

  // 3. Load quarter + sprints
  const quarter = await prisma.quarter.findUnique({
    where: { id: quarterId },
    select: { label: true, sprints: { select: { label: true, startDate: true, endDate: true } } },
  })
  if (!quarter) return

  // 4. Map each date to its sprint
  const sprintMap = new Map<string, string[]>() // sprint label → date strings

  for (const dateStr of dates) {
    const date = new Date(dateStr + "T00:00:00.000Z")
    const sprint = quarter.sprints.find(
      (s) => date >= s.startDate && date <= s.endDate
    )
    const key = sprint?.label ?? "Outside sprint range"
    if (!sprintMap.has(key)) sprintMap.set(key, [])
    sprintMap.get(key)!.push(format(date, "MMM d"))
  }

  const sprintSummary = Array.from(sprintMap.entries()).map(([label, sprintDates]) => ({
    label,
    dates: sprintDates,
  }))

  // 5. Send the email
  await sendVacationChangeNotification({
    changerName: user.name,
    changerEmail: user.email,
    teamName: user.team.name,
    quarterLabel: quarter.label,
    action,
    sprintSummary,
    toEmails: teamLeads.map((tl) => tl.email),
  })
}
