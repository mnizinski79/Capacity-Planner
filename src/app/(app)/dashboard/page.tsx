import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plane, ArrowRight } from "lucide-react"
import { format, differenceInCalendarDays, isSameDay, isWeekend, eachDayOfInterval } from "date-fns"
import { calculateNetCapacity, toDateOnly } from "@/lib/capacity"
import { SprintCalendar } from "@/components/sprint-calendar"

export default async function DashboardPage() {
  const session = await auth()
  const now = new Date()

  const activeQuarter = await prisma.quarter.findFirst({
    where: { isActive: true },
    include: {
      sprints: { orderBy: { sprintNumber: "asc" } },
      holidays: { orderBy: { date: "asc" } },
    },
    orderBy: [{ year: "desc" }, { quarterNumber: "desc" }],
  })

  const currentSprint = activeQuarter?.sprints.find(
    (s) => new Date(s.startDate) <= now && now <= new Date(s.endDate)
  ) ?? null

  // Sprint headline: days left + next milestone
  const daysLeftInSprint = currentSprint
    ? Math.max(0, differenceInCalendarDays(toDateOnly(new Date(currentSprint.endDate)), toDateOnly(now)))
    : null

  const MILESTONE_NOTES: Record<number, string> = {
    0: "Sprint Start",
    1: "Deadline to kick off work",
    2: "Draft Problem statements",
    5: "Manager review",
    7: "Product Review",
    9: "End of sprint",
  }

  let nextMilestone: string | null = null
  if (currentSprint) {
    const sprintDays = eachDayOfInterval({
      start: toDateOnly(new Date(currentSprint.startDate)),
      end: toDateOnly(new Date(currentSprint.endDate)),
    }).filter((d) => !isWeekend(d))
    const today = toDateOnly(now)
    for (let i = 0; i < sprintDays.length; i++) {
      if (sprintDays[i] >= today && MILESTONE_NOTES[i]) {
        nextMilestone = MILESTONE_NOTES[i]
        break
      }
    }
  }

  // Card 1: Days left in quarter
  const lastSprint = activeQuarter?.sprints[activeQuarter.sprints.length - 1]
  const daysLeftInQuarter = lastSprint
    ? Math.max(0, differenceInCalendarDays(toDateOnly(new Date(lastSprint.endDate)), toDateOnly(now)))
    : null

  // Cards 2 & 3: My sprint points + my days off
  let mySprintPoints: number | null = null
  let myRemainingSprintPoints: number | null = null
  let myDaysOff = 0
  let myNextDayOff: Date | null = null

  if (session && currentSprint && activeQuarter) {
    // Normalize sprint boundaries to UTC midnight so that vacation days stored
    // as T00:00:00.000Z are not excluded when sprint dates are stored as local midnight.
    const sprintStartUTC = new Date(Date.UTC(
      new Date(currentSprint.startDate).getUTCFullYear(),
      new Date(currentSprint.startDate).getUTCMonth(),
      new Date(currentSprint.startDate).getUTCDate(),
    ))
    const sprintEndUTC = new Date(Date.UTC(
      new Date(currentSprint.endDate).getUTCFullYear(),
      new Date(currentSprint.endDate).getUTCMonth(),
      new Date(currentSprint.endDate).getUTCDate(),
    ))

    const [currentUser, myVacationDays, myOverride] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { baseCapacity: true, isContractor: true },
      }),
      prisma.vacationDay.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: sprintStartUTC,
            lte: sprintEndUTC,
          },
        },
      }),
      prisma.capacityOverride.findFirst({
        where: { userId: session.user.id, sprintId: currentSprint.id },
      }),
    ])

    const holidayDates = activeQuarter.holidays
      .filter((h) => !h.excludesContractors || !currentUser?.isContractor)
      .map((h) => new Date(h.date))

    const vacDates = myVacationDays.map((v) => new Date(v.date))

    const result = calculateNetCapacity(
      currentUser?.baseCapacity ?? 40,
      new Date(currentSprint.startDate),
      new Date(currentSprint.endDate),
      holidayDates,
      vacDates,
      myOverride?.overridePoints ?? undefined
    )
    mySprintPoints = result.netCapacity

    // Remaining points: proportional to remaining working days in sprint
    const allWorkingDays = eachDayOfInterval({
      start: toDateOnly(new Date(currentSprint.startDate)),
      end: toDateOnly(new Date(currentSprint.endDate)),
    }).filter((d) => !isWeekend(d))
    const todayDate = toDateOnly(now)
    const remainingWorkingDays = allWorkingDays.filter((d) => d >= todayDate).length
    if (allWorkingDays.length > 0) {
      myRemainingSprintPoints = Math.floor(mySprintPoints * remainingWorkingDays / allWorkingDays.length)
    }

    myDaysOff = result.holidayDays + result.vacationDays

    // Find next upcoming day off (holiday or vacation) in sprint
    const sprintStart = toDateOnly(new Date(currentSprint.startDate))
    const sprintEnd = toDateOnly(new Date(currentSprint.endDate))
    const today = toDateOnly(now)

    const upcomingHolidays = holidayDates.filter((h) => {
      const d = toDateOnly(h)
      return d >= today && d >= sprintStart && d <= sprintEnd && !isWeekend(d)
    })
    const upcomingVacation = vacDates.filter((v) => {
      const d = toDateOnly(v)
      if (d < today || d < sprintStart || d > sprintEnd || isWeekend(d)) return false
      if (holidayDates.some((h) => isSameDay(toDateOnly(h), d))) return false
      return true
    })
    const allUpcoming = [...upcomingHolidays, ...upcomingVacation].sort(
      (a, b) => toDateOnly(a).getTime() - toDateOnly(b).getTime()
    )
    myNextDayOff = allUpcoming[0] ?? null
  }

  // Card 4: Team members off this sprint
  let teamMembersOff: string[] = []
  let teamOffCount = 0
  if (currentSprint) {
    const teamSprintStartUTC = new Date(Date.UTC(
      new Date(currentSprint.startDate).getUTCFullYear(),
      new Date(currentSprint.startDate).getUTCMonth(),
      new Date(currentSprint.startDate).getUTCDate(),
    ))
    const teamSprintEndUTC = new Date(Date.UTC(
      new Date(currentSprint.endDate).getUTCFullYear(),
      new Date(currentSprint.endDate).getUTCMonth(),
      new Date(currentSprint.endDate).getUTCDate(),
    ))
    const vacations = await prisma.vacationDay.findMany({
      where: {
        date: {
          gte: teamSprintStartUTC,
          lte: teamSprintEndUTC,
        },
      },
      include: { user: { select: { name: true } } },
      distinct: ["userId"],
    })
    teamOffCount = vacations.length
    teamMembersOff = vacations
      .map((v) => v.user.name)
      .filter((n): n is string => !!n)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user.name}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Days left in quarter */}
        <Card className="py-0">
          <CardContent className="p-5">
            <div>
              <p className="text-3xl font-bold tracking-tight">{daysLeftInQuarter ?? "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Days left in quarter</p>
              <p className="text-xs text-muted-foreground">{activeQuarter?.label}</p>
            </div>
          </CardContent>
        </Card>

        {/* My remaining sprint points */}
        <Card className="py-0">
          <CardContent className="p-5">
            <div>
              <p className="text-3xl font-bold tracking-tight">
                {myRemainingSprintPoints ?? mySprintPoints ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Remaining sprint points</p>
              {currentSprint && mySprintPoints !== null ? (
                <p className="text-xs text-muted-foreground">{currentSprint.label} total: {mySprintPoints}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No active sprint</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My days off this sprint */}
        <Card className="py-0">
          <CardContent className="p-5">
            <div>
              <p className="text-3xl font-bold tracking-tight">{myDaysOff}</p>
              <p className="text-sm text-muted-foreground mt-1">My days off this sprint</p>
              {myNextDayOff ? (
                <p className="text-xs text-muted-foreground">Next: {format(toDateOnly(myNextDayOff), "MMM d")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No upcoming days off</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team off this sprint */}
        <Card className="py-0">
          <CardContent className="p-5">
            <div>
              <p className="text-3xl font-bold tracking-tight">{teamOffCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Team off this sprint</p>
              {teamMembersOff.length > 0 ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{teamMembersOff.join(", ")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No one off</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current quarter sprints */}
      {activeQuarter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {daysLeftInSprint !== null && currentSprint
                    ? `${daysLeftInSprint} days left in ${currentSprint.label}`
                    : activeQuarter.label}
                </CardTitle>
                <CardDescription>
                  {nextMilestone ? `Next Milestone: ${nextMilestone}` : `${activeQuarter.sprints.length} sprints`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/my-capacity">View my capacity <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              {activeQuarter.sprints.map((sprint) => {
                const isActive = new Date(sprint.startDate) <= now && now <= new Date(sprint.endDate)
                return (
                  <div
                    key={sprint.id}
                    className={`flex-1 min-w-0 rounded-md border p-3 text-center space-y-1 ${isActive ? "border-primary bg-primary/5" : ""}`}
                  >
                    <p className="text-sm font-semibold">{sprint.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(sprint.startDate), "MM/dd")} – {format(new Date(sprint.endDate), "MM/dd")}
                    </p>
                  </div>
                )
              })}
            </div>
            {currentSprint && (
              <SprintCalendar
                startDate={currentSprint.startDate.toISOString()}
                endDate={currentSprint.endDate.toISOString()}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/team-capacity">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Team Capacity
              </CardTitle>
              <CardDescription>View sprint capacity for your whole team</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/vacation">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4" /> Submit Vacation
              </CardTitle>
              <CardDescription>Add or manage your planned time off</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
