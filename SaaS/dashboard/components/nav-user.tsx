"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/SaaS/dashboard/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/SaaS/dashboard/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/SaaS/dashboard/components/ui/sidebar"
import { ChevronsUpDownIcon, SparklesIcon, BadgeCheckIcon, CreditCardIcon, BellIcon, LogOutIcon } from "lucide-react"
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

function getUserAvatarUrl(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined
  const avatar =
    (typeof meta?.avatar_url === "string" ? meta.avatar_url : null) ??
    (typeof meta?.picture === "string" ? meta.picture : null)

  if (avatar) return avatar

  const seed = encodeURIComponent(session.user.email ?? "user")
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
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

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? "U"
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return (a + b).toUpperCase()
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const [session, setSession] = React.useState<Session | null>(null)
  const [loggingOut, setLoggingOut] = React.useState(false)

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

  const handleLogout = React.useCallback(async () => {
    if (typeof window === "undefined") return
    setLoggingOut(true)
    try {
      const { url, key } = getSupabaseConfig()
      const supabase = createClient(url, key)
      await supabase.auth.signOut()
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (k.startsWith("mwcore.egresos.") || k.startsWith("mwcore.ingresos.")) {
            window.localStorage.removeItem(k)
          }
        }
      } catch {
        return
      }
    } finally {
      setLoggingOut(false)
      window.location.href = "/auth"
    }
  }, [])

  const name = session ? getUserDisplayName(session) : "Usuario"
  const email = session?.user.email ?? ""
  const avatarUrl = session ? getUserAvatarUrl(session) : ""
  const initials = getInitials(name || email || "Usuario")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl"
            >
              <Avatar className="h-9 w-9 rounded-xl">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="rounded-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-72 rounded-2xl p-2 bg-background text-foreground ring-1 ring-sidebar-border"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback className="rounded-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="h-11 rounded-xl hover:bg-muted hover:text-foreground">
                <SparklesIcon
                />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="h-11 rounded-xl hover:bg-muted hover:text-foreground">
                <BadgeCheckIcon
                />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="h-11 rounded-xl hover:bg-muted hover:text-foreground">
                <CreditCardIcon
                />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="h-11 rounded-xl hover:bg-muted hover:text-foreground">
                <BellIcon
                />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!session || loggingOut}
              className="cursor-pointer h-11 rounded-xl hover:bg-muted hover:text-foreground"
              onSelect={(e) => {
                e.preventDefault()
                void handleLogout()
              }}
            >
              <LogOutIcon
              />
              {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
