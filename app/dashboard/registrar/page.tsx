"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import * as React from "react"

import { AppSidebar } from "@/SaaS/dashboard/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Button } from "@/SaaS/dashboard/components/ui/button"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/SaaS/dashboard/components/ui/sidebar"
import { TooltipProvider } from "@/SaaS/dashboard/components/ui/tooltip"
import { Textarea } from "@/SaaS/dashboard/components/ui/textarea"

type ExpenseDraft = {
  amount: string
  category: string
  date: string
  description: string
}

type ExpenseItem = ExpenseDraft & {
  id: string
  createdAt: string
}

type Tenant = {
  id: string
  name: string
}

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

function formatDateInputValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getLocalStorageKey(userId?: string, tenantId?: string) {
  const uid = userId ?? "anon"
  const tid = tenantId ?? "anon"
  return `mwcore.egresos.${tid}.${uid}`
}

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
}

function loadLocalExpenses(key: string): ExpenseItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExpenseItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveLocalExpenses(key: string, items: ExpenseItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(items))
}

const defaultCategories = [
  "Comida",
  "Transporte",
  "Servicios",
  "Renta",
  "Salud",
  "Educación",
  "Entretenimiento",
  "Otros",
]

const TABLE_NAME = process.env.NEXT_PUBLIC_EXPENSES_TABLE ?? "egresos"
const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

export default function RegistrarEgresosPage() {
  const [session, setSession] = React.useState<Session | null>(null)
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [tenantId, setTenantId] = React.useState<string>("")
  const [newTenantName, setNewTenantName] = React.useState("")
  const [draft, setDraft] = React.useState<ExpenseDraft>(() => ({
    amount: "",
    category: defaultCategories[0],
    date: formatDateInputValue(new Date()),
    description: "",
  }))
  const [items, setItems] = React.useState<ExpenseItem[]>(() => [])
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setItems(loadLocalExpenses(getLocalStorageKey()))
  }, [])

  React.useEffect(() => {
    try {
      const { url, key } = getSupabaseConfig()
      const supabase = createClient(url, key)

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s)
      })

      return () => {
        data.subscription.unsubscribe()
      }
    } catch {
      return
    }
  }, [])

  React.useEffect(() => {
    if (!session) {
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const { url, key } = getSupabaseConfig()
        const supabase = createClient(url, key)

        const activeTenantStored =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(getActiveTenantKey(session.user.id))

        const { data: memberRows, error: memberError } = await supabase
          .from(TENANT_MEMBERS_TABLE)
          .select("tenant_id")
          .eq("user_id", session.user.id)

        if (cancelled) return

        if (memberError) {
          setNotice("No se pudieron cargar espacios (tenants).")
          setError(memberError.message)
          return
        }

        const tenantIds = (memberRows ?? [])
          .map((r) => String((r as { tenant_id: unknown }).tenant_id))
          .filter(Boolean)

        if (tenantIds.length === 0) {
          setTenants([])
          setTenantId("")
          setItems([])
          return
        }

        const { data: tenantRows, error: tenantsError } = await supabase
          .from(TENANTS_TABLE)
          .select("id, name")
          .in("id", tenantIds)
          .order("created_at", { ascending: true })

        if (cancelled) return

        if (tenantsError) {
          setNotice("No se pudieron cargar espacios (tenants).")
          setError(tenantsError.message)
          return
        }

        const mappedTenants: Tenant[] = (tenantRows ?? []).map((t) => ({
          id: String((t as { id: unknown }).id),
          name: String((t as { name: unknown }).name),
        }))

        setTenants(mappedTenants)

        const nextTenantId =
          (activeTenantStored &&
            mappedTenants.some((t) => t.id === activeTenantStored) &&
            activeTenantStored) ||
          mappedTenants[0]?.id ||
          ""

        setTenantId(nextTenantId)

        const { data: expensesRows, error: expensesError } = await supabase
          .from(TABLE_NAME)
          .select("id, amount, category, description, spent_at, created_at")
          .eq("tenant_id", nextTenantId)
          .order("spent_at", { ascending: false })
          .limit(20)

        if (cancelled) return

        if (expensesError) {
          setNotice("No se pudieron cargar egresos desde Supabase.")
          setError(expensesError.message)
          return
        }

        const mappedExpenses: ExpenseItem[] = (expensesRows ?? []).map((row) => ({
          amount: String((row as { amount?: unknown }).amount ?? ""),
          category: String((row as { category?: unknown }).category ?? ""),
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
          date: formatDateInputValue(
            new Date(String((row as { spent_at?: unknown }).spent_at))
          ),
          description: String((row as { description?: unknown }).description ?? ""),
          id: String((row as { id?: unknown }).id ?? ""),
        }))

        setItems(mappedExpenses)
        saveLocalExpenses(getLocalStorageKey(session.user.id, nextTenantId), mappedExpenses)
        window.localStorage.setItem(getActiveTenantKey(session.user.id), nextTenantId)
      } catch {
        if (cancelled) return
        setNotice("No se pudieron cargar datos desde Supabase.")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session])

  React.useEffect(() => {
    if (!session) {
      return
    }
    if (!tenantId) {
      return
    }

    window.localStorage.setItem(getActiveTenantKey(session.user.id), tenantId)
  }, [session, tenantId])

  React.useEffect(() => {
    if (!session) {
      return
    }
    if (!tenantId) {
      return
    }

    setItems(loadLocalExpenses(getLocalStorageKey(session.user.id, tenantId)))

    let cancelled = false

    const run = async () => {
      try {
        const { url, key } = getSupabaseConfig()
        const supabase = createClient(url, key)

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select("id, amount, category, description, spent_at, created_at")
          .eq("tenant_id", tenantId)
          .order("spent_at", { ascending: false })
          .limit(20)

        if (cancelled) return

        if (error) {
          setNotice("No se pudieron cargar egresos desde Supabase.")
          setError(error.message)
          return
        }

        const mapped: ExpenseItem[] = (data ?? []).map((row) => ({
          amount: String((row as { amount?: unknown }).amount ?? ""),
          category: String((row as { category?: unknown }).category ?? ""),
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
          date: formatDateInputValue(new Date(String((row as { spent_at?: unknown }).spent_at))),
          description: String((row as { description?: unknown }).description ?? ""),
          id: String((row as { id?: unknown }).id ?? ""),
        }))

        setItems(mapped)
        saveLocalExpenses(getLocalStorageKey(session.user.id, tenantId), mapped)
      } catch {
        if (cancelled) return
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, tenantId])

  React.useEffect(() => {
    if (!session) {
      return
    }

    const handler = () => {
      const stored = window.localStorage.getItem(getActiveTenantKey(session.user.id))
      if (stored && stored !== tenantId) {
        setTenantId(stored)
      }
    }

    window.addEventListener("mwcore:tenant-change", handler as EventListener)
    return () => {
      window.removeEventListener("mwcore:tenant-change", handler as EventListener)
    }
  }, [session, tenantId])

  async function handleCreateTenant() {
    setNotice(null)
    setError(null)

    if (!session) {
      setError("Inicia sesión para crear un espacio.")
      return
    }
    const name = newTenantName.trim()
    if (!name) {
      setError("Escribe un nombre para el espacio.")
      return
    }

    setBusy(true)
    try {
      const { url, key } = getSupabaseConfig()
      const supabase = createClient(url, key)

      const { data: created, error: createError } = await supabase
        .from(TENANTS_TABLE)
        .insert({ name })
        .select("id, name")
        .single()

      if (createError) {
        setError(createError.message)
        return
      }

      const createdTenant: Tenant = {
        id: String((created as { id: unknown }).id),
        name: String((created as { name: unknown }).name),
      }

      const { error: memberError } = await supabase.from(TENANT_MEMBERS_TABLE).insert({
        role: "owner",
        tenant_id: createdTenant.id,
        user_id: session.user.id,
      })

      if (memberError) {
        setError(memberError.message)
        return
      }

      setTenants((prev) => [...prev, createdTenant])
      setTenantId(createdTenant.id)
      setNewTenantName("")
      setNotice("Espacio creado.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    setError(null)

    const amountNumber = Number(draft.amount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Monto inválido.")
      return
    }
    if (!draft.date) {
      setError("Selecciona una fecha.")
      return
    }

    if (session && !tenantId) {
      setError("Selecciona un espacio.")
      return
    }

    setBusy(true)
    try {
      if (session) {
        const { url, key } = getSupabaseConfig()
        const supabase = createClient(url, key)
        const payload = {
          amount: amountNumber,
          category: draft.category,
          description: draft.description,
          spent_at: new Date(`${draft.date}T00:00:00.000Z`).toISOString(),
          tenant_id: tenantId,
          user_id: session.user.id,
        }

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert(payload)
          .select("id, amount, category, description, spent_at, created_at")
          .single()

        if (error) {
          setError(error.message)
          setNotice("No se pudo guardar en Supabase. Guardado localmente.")

          const fallbackItem: ExpenseItem = {
            ...draft,
            amount: String(amountNumber),
            createdAt: new Date().toISOString(),
            id: crypto.randomUUID(),
          }

          setItems((prev) => {
            const next = [fallbackItem, ...prev]
            saveLocalExpenses(getLocalStorageKey(session.user.id, tenantId), next)
            return next
          })
        } else {
          const savedItem: ExpenseItem = {
            amount: String(data.amount ?? amountNumber),
            category: String(data.category ?? draft.category),
            createdAt: String(data.created_at ?? new Date().toISOString()),
            date: formatDateInputValue(new Date(String(data.spent_at))),
            description: String(data.description ?? draft.description),
            id: String(data.id),
          }

          setItems((prev) => {
            const next = [savedItem, ...prev]
            saveLocalExpenses(getLocalStorageKey(session.user.id, tenantId), next)
            return next
          })

          setNotice("Egreso registrado en Supabase.")
        }
      } else {
        const localItem: ExpenseItem = {
          ...draft,
          amount: String(amountNumber),
          createdAt: new Date().toISOString(),
          id: crypto.randomUUID(),
        }

        setItems((prev) => {
          const next = [localItem, ...prev]
          saveLocalExpenses(getLocalStorageKey(), next)
          return next
        })

        setNotice("Egreso guardado localmente (sin sesión).")
      }

      setDraft((prev) => ({
        ...prev,
        amount: "",
        description: "",
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setBusy(false)
    }
  }

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
                    <BreadcrumbPage>Registrar egresos</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Espacio</div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    disabled={!session || tenants.length === 0}
                  >
                    <option value="" disabled>
                      {session ? "Selecciona un espacio" : "Inicia sesión"}
                    </option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex w-full gap-2 md:w-1/2">
                    <Input
                      placeholder="Nuevo espacio…"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      disabled={!session}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateTenant}
                      disabled={!session || busy}
                      className="bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
                    >
                      Crear
                    </Button>
                  </div>
                </div>
                {!session ? (
                  <div className="text-sm text-muted-foreground">
                    Inicia sesión para usar multi-tenant (espacios).
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Crea tu primer espacio para empezar.
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">Monto</div>
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, amount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">Categoría</div>
                    <select
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      value={draft.category}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, category: e.target.value }))
                      }
                    >
                      {defaultCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">Fecha</div>
                    <Input
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Descripción</div>
                  <Textarea
                    rows={3}
                    placeholder="Ej. Supermercado, gasolina, etc."
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {notice ? notice : session ? "Con sesión activa" : "Sin sesión"}
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
                  >
                    {busy ? "Guardando…" : "Registrar"}
                  </Button>
                </div>

                {error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : null}
              </form>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="mb-2 text-sm font-medium">Últimos egresos</div>
                <div className="space-y-2">
                  {items.slice(0, 8).map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-4 rounded-lg bg-background/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {it.category} • {it.date}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {it.description || "Sin descripción"}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold">
                        -{it.amount}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Aún no hay egresos registrados.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
