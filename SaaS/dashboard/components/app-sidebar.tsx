"use client"

import * as React from "react"
import { createClient, type Session } from "@supabase/supabase-js"

import { NavMain } from "@/SaaS/dashboard/components/nav-main"
import { NavProjects } from "@/SaaS/dashboard/components/nav-projects"
import { NavUser } from "@/SaaS/dashboard/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/SaaS/dashboard/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/SaaS/dashboard/components/ui/sidebar"
import {
  Command,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  CreditCardIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: (
        <TerminalSquareIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "Resumen Mensual",
          url: "#",
        },
        {
          title: "Notificaciones",
          url: "#",
        },
        {
          title: "IA",
          url: "/dashboard/ia",
        },
      ],
    },
    {
      title: "Movimientos",
      url: "#",
      icon: (
        <BotIcon
        />
      ),
      items: [
        {
          title: "Egresos",
          url: "/dashboard/registrar",
        },
        {
          title: "Ingresos",
          url: "/dashboard/ingresos",
        },
        {
          title: "Historial",
          url: "/dashboard/historial",
        },
      ],
    },
    {
      title: "Presupuesto",
      url: "#",
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "Presupuestos Activos",
          url: "#",
        },
        {
          title: "Gastos Fijos",
          url: "#",
        },
        {
          title: "Metas de Ahorro",
          url: "#",
        },
      ],
    },
    {
      title: "Cuentas",
      url: "#",
      icon: (
        <CreditCardIcon
        />
      ),
      items: [
        {
          title: "Mis Cuentas",
          url: "/dashboard/cuentas",
        },
        {
          title: "Tarjetas de Crédito",
          url: "/dashboard/cuentas",
        },
        {
          title: "Conexiones Bancarias",
          url: "#",
        },
      ],
    },
    {
      title: "Configuración",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "Ajustes Generales",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "Travel",
      url: "#",
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}

type Tenant = {
  id: string
  name: string
}

const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    return null
  }

  return { key, url }
}

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
}

function getDefaultTenantName(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined
  const candidates = [
    typeof meta?.name === "string" ? meta.name : null,
    typeof meta?.full_name === "string" ? meta.full_name : null,
    session.user.email ?? null,
  ].filter(Boolean) as string[]

  const who = candidates[0] ?? "Mi"
  return `Espacio de ${who}`
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const supabase = React.useMemo(() => {
    const cfg = getSupabaseConfig()
    if (!cfg) return null
    return createClient(cfg.url, cfg.key)
  }, [])

  const { isMobile } = useSidebar()
  const [session, setSession] = React.useState<Session | null>(null)
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [activeTenantId, setActiveTenantId] = React.useState<string>("")

  React.useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])

  React.useEffect(() => {
    if (!supabase || !session) {
      setTenants([])
      setActiveTenantId("")
      return
    }

    let cancelled = false

    const run = async () => {
      const stored =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(getActiveTenantKey(session.user.id))

      const { data: memberRows, error: memberError } = await supabase
        .from(TENANT_MEMBERS_TABLE)
        .select("tenant_id")
        .eq("user_id", session.user.id)

      if (cancelled) return
      if (memberError) return

      const tenantIds = (memberRows ?? [])
        .map((r) => String((r as { tenant_id: unknown }).tenant_id))
        .filter(Boolean)

      if (tenantIds.length === 0) {
        const { data: created, error: createError } = await supabase
          .from(TENANTS_TABLE)
          .insert({ name: getDefaultTenantName(session) })
          .select("id, name")
          .single()

        if (cancelled) return

        if (createError) {
          setTenants([])
          setActiveTenantId("")
          return
        }

        const createdTenant: Tenant = {
          id: String((created as { id: unknown }).id),
          name: String((created as { name: unknown }).name),
        }

        const { error: memberInsertError } = await supabase
          .from(TENANT_MEMBERS_TABLE)
          .insert({
            role: "owner",
            tenant_id: createdTenant.id,
            user_id: session.user.id,
          })

        if (cancelled) return

        if (memberInsertError) {
          setTenants([])
          setActiveTenantId("")
          return
        }

        setTenants([createdTenant])
        setActiveTenantId(createdTenant.id)
        window.localStorage.setItem(getActiveTenantKey(session.user.id), createdTenant.id)
        window.dispatchEvent(new CustomEvent("mwcore:tenant-change"))
        return
      }

      const { data: tenantRows, error: tenantsError } = await supabase
        .from(TENANTS_TABLE)
        .select("id, name")
        .in("id", tenantIds)
        .order("created_at", { ascending: true })

      if (cancelled) return
      if (tenantsError) return

      const mappedTenants: Tenant[] = (tenantRows ?? []).map((t) => ({
        id: String((t as { id: unknown }).id),
        name: String((t as { name: unknown }).name),
      }))

      setTenants(mappedTenants)

      const nextTenantId =
        (stored &&
          mappedTenants.some((t) => t.id === stored) &&
          stored) ||
        mappedTenants[0]?.id ||
        ""

      setActiveTenantId(nextTenantId)
      window.localStorage.setItem(getActiveTenantKey(session.user.id), nextTenantId)
      window.dispatchEvent(new CustomEvent("mwcore:tenant-change"))
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase])

  const activeTenant = React.useMemo(() => {
    if (!activeTenantId) return null
    return tenants.find((t) => t.id === activeTenantId) ?? null
  }, [tenants, activeTenantId])

  const handleSelectTenant = (id: string) => {
    if (!session) return
    setActiveTenantId(id)
    window.localStorage.setItem(getActiveTenantKey(session.user.id), id)
    window.dispatchEvent(new CustomEvent("mwcore:tenant-change"))
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-8 place-items-center text-sidebar-foreground">
            <Command className="size-5" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">MetaWeb Core</span>
          </div>
        </div>
        {session && tenants.length > 0 && activeTenant ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{activeTenant.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        Espacio activo
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  align="start"
                  side={isMobile ? "bottom" : "right"}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Espacios
                  </DropdownMenuLabel>
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleSelectTenant(t.id)}
                      className="gap-2 p-2"
                    >
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={() => {
                      window.location.href = "/dashboard/registrar"
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <PlusIcon className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      Crear espacio
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
