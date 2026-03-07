import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { NavSidebar } from "@/components/nav-sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden">
      <NavSidebar userName={session.user.name} userRole={session.user.role} />
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6 print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  )
}
