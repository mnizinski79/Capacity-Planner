import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { addDays, addWeeks, startOfDay } from "date-fns"

const prisma = new PrismaClient()

function nextWeekday(date: Date): Date {
  let d = startOfDay(date)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d = addDays(d, 1)
  }
  return d
}

async function main() {
  console.log("Seeding database…")

  // Create teams
  const frontend = await prisma.team.upsert({
    where: { id: "team-frontend" },
    update: {},
    create: { id: "team-frontend", name: "Frontend" },
  })

  const platform = await prisma.team.upsert({
    where: { id: "team-platform" },
    update: {},
    create: { id: "team-platform", name: "Platform" },
  })

  // Create users
  const adminHash = await bcrypt.hash("password123", 12)
  const userHash = await bcrypt.hash("password123", 12)

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminHash,
      role: "admin",
      baseCapacity: 40,
      teamId: frontend.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      passwordHash: userHash,
      role: "user",
      baseCapacity: 40,
      teamId: frontend.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      passwordHash: userHash,
      role: "user",
      baseCapacity: 35,
      teamId: platform.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      email: "carol@example.com",
      name: "Carol Davis",
      passwordHash: userHash,
      role: "user",
      baseCapacity: 40,
      teamId: platform.id,
    },
  })

  // Create Q2 2026
  const existing = await prisma.quarter.findUnique({
    where: { year_quarterNumber: { year: 2026, quarterNumber: 2 } },
  })

  if (!existing) {
    const qStart = nextWeekday(new Date(2026, 3, 1)) // April 1
    const quarter = await prisma.quarter.create({
      data: {
        year: 2026,
        quarterNumber: 2,
        label: "2026 Q2",
        isActive: true,
        sprints: {
          create: Array.from({ length: 6 }, (_, i) => {
            const sprintStart = addWeeks(qStart, i * 2)
            const sprintEnd = addDays(sprintStart, 13)
            return {
              sprintNumber: i + 1,
              label: `Q2.${i + 1}`,
              startDate: startOfDay(sprintStart),
              endDate: startOfDay(sprintEnd),
            }
          }),
        },
        holidays: {
          create: [
            { date: new Date("2026-05-25"), label: "Memorial Day" },
            { date: new Date("2026-06-19"), label: "Juneteenth" },
          ],
        },
      },
    })
    console.log(`Created quarter: ${quarter.label}`)
  }

  console.log("Seed complete.")
  console.log("\nDemo credentials:")
  console.log("  Admin: admin@example.com / password123")
  console.log("  User:  alice@example.com / password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
