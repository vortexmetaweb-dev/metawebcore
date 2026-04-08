"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Button } from "@/SaaS/dashboard/components/ui/button"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { BellIcon, CheckIcon, XIcon } from "lucide-react"
import * as React from "react"

type NotificationKind = "mejora" | "fix" | "nuevo"

type NotificationItem = {
  id: string
  title: string
  body: string
  dateLabel: string
  timeLabel: string
  kind: NotificationKind
  unread?: boolean
}

const STORAGE_KEY = "mwcore.notifications.v1"

const initialUpdates: NotificationItem[] = [
  {
    id: "u1",
    title: "Sección de Resumen Mensual",
    body: "Agregamos un panel para ver ingresos, egresos y balance por mes, con categorías principales.",
    dateLabel: "Hoy",
    timeLabel: "09:15",
    kind: "nuevo",
    unread: true,
  },
  {
    id: "u2",
    title: "Presupuestos Activos",
    body: "Incluimos una herramienta para armar tu presupuesto mensual con gastos, deuda y ahorro.",
    dateLabel: "Hoy",
    timeLabel: "09:03",
    kind: "mejora",
    unread: true,
  },
  {
    id: "u3",
    title: "Chat soporte",
    body: "El chat de soporte se guarda en Supabase y quedó como chat simple.",
    dateLabel: "Esta semana",
    timeLabel: "Ayer",
    kind: "mejora",
  },
]

function kindLabel(kind: NotificationKind) {
  return kind === "nuevo" ? "Nuevo" : kind === "fix" ? "Fix" : "Mejora"
}

function loadStored(): NotificationItem[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null))
      .map((row) => {
        if (!row) return null
        const id = typeof row.id === "string" ? row.id : ""
        const title = typeof row.title === "string" ? row.title : ""
        const body = typeof row.body === "string" ? row.body : ""
        const dateLabel = typeof row.dateLabel === "string" ? row.dateLabel : ""
        const timeLabel = typeof row.timeLabel === "string" ? row.timeLabel : ""
        const kind = row.kind
        const unread = Boolean(row.unread)
        if (!id || !title) return null
        if (kind !== "nuevo" && kind !== "mejora" && kind !== "fix") return null
        return { id, title, body, dateLabel, timeLabel, kind, unread }
      })
      .filter(Boolean) as NotificationItem[]
  } catch {
    return null
  }
}

function saveStored(items: NotificationItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function NotificacionesPage() {
  const [items, setItems] = React.useState<NotificationItem[]>(() => initialUpdates)
  const [filter, setFilter] = React.useState<"todas" | "sin-leer">("todas")

  React.useEffect(() => {
    const stored = loadStored()
    if (stored && stored.length > 0) {
      setItems(stored)
    } else {
      saveStored(initialUpdates)
    }
  }, [])

  React.useEffect(() => {
    saveStored(items)
  }, [items])

  const unreadCount = React.useMemo(
    () => items.filter((i) => i.unread).length,
    [items]
  )

  const visible = React.useMemo(() => {
    if (filter === "sin-leer") {
      return items.filter((i) => i.unread)
    }
    return items
  }, [filter, items])

  const grouped = React.useMemo(() => {
    const order = ["Hoy", "Ayer", "Esta semana", "Este mes", "Anterior"]
    const map = new Map<string, NotificationItem[]>()
    for (const it of visible) {
      const key = it.dateLabel || "Anterior"
      map.set(key, [...(map.get(key) ?? []), it])
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    return keys.map((k) => ({ label: k, items: map.get(k) ?? [] }))
  }, [visible])

  return (
    <>
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
                <BreadcrumbPage>Notificaciones</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">Notificaciones</div>
            <div className="text-sm text-muted-foreground">
              Actualizaciones y cambios recientes en la plataforma.
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={filter === "todas" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("todas")}
            >
              Todas
            </Button>
            <Button
              type="button"
              variant={filter === "sin-leer" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("sin-leer")}
            >
              Sin leer
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() =>
                setItems((prev) => prev.map((it) => ({ ...it, unread: false })))
              }
            >
              <CheckIcon />
              Marcar como leídas
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={items.length === 0}
              onClick={() => setItems([])}
            >
              Limpiar
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-background/50 p-8 text-sm text-muted-foreground">
            No hay notificaciones.
          </div>
        ) : (
          <div className="grid gap-4">
            {grouped.map((group) => (
              <div key={group.label} className="grid gap-2">
                <div className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </div>
                <div className="grid gap-2">
                  {group.items.map((it) => (
                    <div
                      key={it.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, unread: false } : x
                          )
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === it.id ? { ...x, unread: false } : x
                          )
                        )
                      }}
                      className={cn(
                        "flex gap-3 rounded-2xl border border-border bg-background/70 p-4 shadow-sm transition-colors",
                        "hover:bg-background",
                        it.unread ? "ring-1 ring-ring/40" : null
                      )}
                    >
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <BellIcon className="size-5 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold">
                                {it.title}
                              </div>
                              {it.unread ? (
                                <div className="size-2 rounded-full bg-primary" />
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {kindLabel(it.kind)} · {it.timeLabel}
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setItems((prev) => prev.filter((x) => x.id !== it.id))
                            }}
                          >
                            <XIcon />
                          </Button>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {it.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
