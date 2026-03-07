"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  User,
  Users,
  Globe,
  CalendarDays,
  Plane,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/my-capacity", label: "My Capacity", icon: <User className="h-4 w-4" /> },
  { href: "/team-capacity", label: "Team Capacity", icon: <Users className="h-4 w-4" /> },
  { href: "/all-capacity", label: "All Capacity", icon: <Globe className="h-4 w-4" /> },
  { href: "/holidays", label: "Holidays", icon: <CalendarDays className="h-4 w-4" /> },
  { href: "/vacation", label: "My Vacation", icon: <Plane className="h-4 w-4" /> },
]

const adminNav: NavItem[] = [
  { href: "/admin/quarters", label: "Quarters & Sprints", icon: <Settings className="h-4 w-4" /> },
  { href: "/admin/teams", label: "Teams", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <User className="h-4 w-4" /> },
  { href: "/admin/holidays", label: "Holidays", icon: <CalendarDays className="h-4 w-4" /> },
]

interface NavSidebarProps {
  userName: string
  userRole: string
}

export function NavSidebar({ userName, userRole }: NavSidebarProps) {
  const pathname = usePathname()
  const [adminOpen, setAdminOpen] = useState(
    adminNav.some((item) => pathname.startsWith(item.href))
  )
  const isAdmin = userRole === "admin"

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          CP
        </div>
        <span className="font-semibold text-sm">Capacity Planner</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <div className="pt-4">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <Shield className="h-3 w-3" />
              Admin
              <ChevronDown
                className={cn("ml-auto h-3 w-3 transition-transform", adminOpen && "rotate-180")}
              />
            </button>
            {adminOpen && (
              <div className="mt-1 space-y-1">
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      pathname.startsWith(item.href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            {isAdmin && <Badge variant="secondary" className="text-xs px-1 py-0">Admin</Badge>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
