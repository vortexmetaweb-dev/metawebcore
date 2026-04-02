"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import { AppSidebar } from "@/SaaS/dashboard/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/SaaS/dashboard/components/ui/sidebar"
import { TooltipProvider } from "@/SaaS/dashboard/components/ui/tooltip"
import * as React from "react"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase env vars")
  }

  return { url, key }
}

function getUserDisplayName(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined
  const candidates = [
    typeof meta?.name === "string" ? meta.name : null,
    typeof meta?.full_name === "string" ? meta.full_name : null,
    typeof meta?.preferred_username === "string" ? meta.preferred_username : null,
    session.user.email ?? null,
  ].filter(Boolean) as string[]

  return candidates[0] ?? "Usuario"
}

export default function Page() {
  const [session, setSession] = React.useState<Session | null>(null)

  React.useEffect(() => {
    try {
      const { url, key } = getSupabaseConfig()
      const supabase = createClient(url, key)

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => {
        data.subscription.unsubscribe()
      }
    } catch {
      return
    }
  }, [])

  const name = session ? getUserDisplayName(session) : "Usuario"

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">MetaWeb Core</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
