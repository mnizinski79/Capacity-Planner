import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, Users, User, Plane, ArrowRight } from "lucide-react"
import { format } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()

  const [quarters, teams, userCount, myVacation] = await Promise.all([
    prisma.quarter.findMany({
      where: { isActive: true },
      include: { sprints: { orderBy: { sprintNumber: "asc" } } },
      orderBy: [{ year: "desc" }, { quarterNumber: "desc" }],
      take: 3,
    }),
    prisma.team.findMany({ include: { _count: { select: { members: true } } } }),
    prisma.user.count(),
    session
      ? prisma.vacationDay.count({
          where: {
            userId: session.user.id,
            date: { gte: new Date() },
          },
        })
      : Promise.resolve(0),
  ])

  const activeQuarter = quarters[0] ?? null

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user.name}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Active Quarters</CardDescription>
            <CardTitle className="text-3xl">{quarters.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" /> Teams</CardDescription>
            <CardTitle className="text-3xl">{teams.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><User className="h-3 w-3" /> Users</CardDescription>
            <CardTitle className="text-3xl">{userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1"><Plane className="h-3 w-3" /> My Upcoming PTO</CardDescription>
            <CardTitle className="text-3xl">{myVacation}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">days remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Current quarter sprints */}
      {activeQuarter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeQuarter.label}</CardTitle>
                <CardDescription>{activeQuarter.sprints.length} sprints</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/my-capacity">View my capacity <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {activeQuarter.sprints.map((sprint) => {
                const now = new Date()
                const isActive = new Date(sprint.startDate) <= now && now <= new Date(sprint.endDate)
                return (
                  <div
                    key={sprint.id}
                    className={`rounded-md border p-3 text-center space-y-1 ${isActive ? "border-primary bg-primary/5" : ""}`}
                  >
                    <p className="text-sm font-semibold">{sprint.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sprint.startDate), "MM/dd")} – {format(new Date(sprint.endDate), "MM/dd")}
                    </p>
                    {isActive && <Badge className="text-xs">Current</Badge>}
                  </div>
                )
              })}
            </div>
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
