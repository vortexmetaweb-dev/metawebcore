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
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/SaaS/dashboard/components/ui/sidebar"
import { TooltipProvider } from "@/SaaS/dashboard/components/ui/tooltip"

type MovementType = "ingreso" | "egreso"

type MovementItem = {
  id: string
  type: MovementType
  amount: number
  date: string
  category: string
  description: string
  createdAt: string
}

type ExpenseLocalItem = {
  id: string
  amount: string
  category: string
  date: string
  description: string
  createdAt: string
}

type IncomeLocalItem = {
  id: string
  amount: string
  category: string
  date: string
  description: string
  createdAt: string
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

function loadLocalJson<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function getLocalExpensesKey(userId?: string, tenantId?: string) {
  const uid = userId ?? "anon"
  const tid = tenantId ?? "personal"
  return `mwcore.egresos.${tid}.${uid}`
}

function getLocalIncomesKey(userId?: string, tenantId?: string) {
  const uid = userId ?? "anon"
  const tid = tenantId ?? "personal"
  return `mwcore.ingresos.${tid}.${uid}`
}

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
}

function isMissingSchemaError(message: string) {
  const msg = message.toLowerCase()
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find") ||
    msg.includes("unknown column") ||
    msg.includes("column") ||
    msg.includes("relation")
  )
}

function formatDateInputValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const EXPENSES_TABLE_NAME = process.env.NEXT_PUBLIC_EXPENSES_TABLE ?? "egresos"
const INCOMES_TABLE_NAME = process.env.NEXT_PUBLIC_INCOMES_TABLE ?? "ingresos"
const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

export default function HistorialPage() {
  const supabase = React.useMemo(() => {
    try {
      const { url, key } = getSupabaseConfig()
      return createClient(url, key)
    } catch {
      return null
    }
  }, [])

  const moneyFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }),
    []
  )

  const formatSignedMoney = React.useCallback(
    (n: number) => {
      if (!Number.isFinite(n)) return ""
      return n < 0
        ? `-${moneyFormatter.format(Math.abs(n))}`
        : moneyFormatter.format(n)
    },
    [moneyFormatter]
  )

  const [session, setSession] = React.useState<Session | null>(null)
  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<MovementItem[]>(() => [])
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const uid = session?.user.id
    const tid = tenantId ?? "personal"
    const localExpenses = loadLocalJson<ExpenseLocalItem>(getLocalExpensesKey(uid, tid))
    const localIncomes = loadLocalJson<IncomeLocalItem>(getLocalIncomesKey(uid, tid))

    const merged: MovementItem[] = [
      ...localExpenses.map((e) => ({
        id: String(e.id),
        type: "egreso" as const,
        amount: -Math.abs(Number(e.amount)),
        date: String(e.date),
        category: String(e.category),
        description: String(e.description ?? ""),
        createdAt: String(e.createdAt ?? ""),
      })),
      ...localIncomes.map((i) => ({
        id: String(i.id),
        type: "ingreso" as const,
        amount: Math.abs(Number(i.amount)),
        date: String(i.date),
        category: String(i.category),
        description: String(i.description ?? ""),
        createdAt: String(i.createdAt ?? ""),
      })),
    ].filter((x) => Number.isFinite(x.amount))

    merged.sort((a, b) => b.date.localeCompare(a.date))
    setItems(merged)
  }, [session, tenantId])

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
      setTenantId(null)
      return
    }

    let cancelled = false

    const run = async () => {
      setNotice(null)
      setError(null)
      try {
        const stored =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(getActiveTenantKey(session.user.id))

        let resolvedTenantId: string | null = null

        const { data: memberRows, error: memberError } = await supabase
          .from(TENANT_MEMBERS_TABLE)
          .select("tenant_id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })

        if (cancelled) return

        if (memberError) {
          if (!isMissingSchemaError(memberError.message)) {
            setNotice("No se pudo cargar el historial completo desde Supabase.")
            setError(memberError.message)
            return
          }
        } else {
          const tenantIds = (memberRows ?? [])
            .map((r) => String((r as { tenant_id?: unknown }).tenant_id ?? ""))
            .filter(Boolean)

          const preferred =
            stored && tenantIds.includes(stored) ? stored : tenantIds[0] ?? ""

          if (preferred) {
            resolvedTenantId = preferred
          } else {
            const { data: createdTenant, error: createTenantError } = await supabase
              .from(TENANTS_TABLE)
              .insert({ name: "Personal" })
              .select("id")
              .single()

            if (cancelled) return

            if (createTenantError) {
              setNotice("No se pudo cargar el historial completo desde Supabase.")
              setError(createTenantError.message)
              return
            }

            resolvedTenantId = String((createdTenant as { id?: unknown }).id ?? "")
            if (!resolvedTenantId) {
              setNotice("No se pudo cargar el historial completo desde Supabase.")
              setError("Tenant inválido.")
              return
            }

            const { error: memberInsertError } = await supabase
              .from(TENANT_MEMBERS_TABLE)
              .insert({
                role: "owner",
                tenant_id: resolvedTenantId,
                user_id: session.user.id,
              })

            if (cancelled) return

            if (memberInsertError) {
              setNotice("No se pudo cargar el historial completo desde Supabase.")
              setError(memberInsertError.message)
              return
            }
          }
        }

        setTenantId(resolvedTenantId)
        if (resolvedTenantId && typeof window !== "undefined") {
          window.localStorage.setItem(getActiveTenantKey(session.user.id), resolvedTenantId)
        }

        const expensesQuery = supabase
          .from(EXPENSES_TABLE_NAME)
          .select("id, amount, category, description, spent_at, created_at")
          .order("spent_at", { ascending: false })
          .limit(50)

        const incomesQuery = supabase
          .from(INCOMES_TABLE_NAME)
          .select("id, amount, category, description, received_at, created_at")
          .order("received_at", { ascending: false })
          .limit(50)

        const [
          { data: expenseRows, error: expenseError },
          { data: incomeRows, error: incomeError },
        ] = await Promise.all([
          resolvedTenantId && resolvedTenantId !== "null"
            ? expensesQuery.eq("tenant_id", resolvedTenantId)
            : expensesQuery.eq("user_id", session.user.id),
          resolvedTenantId && resolvedTenantId !== "null"
            ? incomesQuery.eq("tenant_id", resolvedTenantId)
            : incomesQuery.eq("user_id", session.user.id),
        ])

        if (cancelled) return

        if (expenseError || incomeError) {
          setNotice("No se pudo cargar el historial completo desde Supabase.")
          setError(expenseError?.message ?? incomeError?.message ?? "Error desconocido")
          return
        }

        const expenses: MovementItem[] = (expenseRows ?? []).map((row) => ({
          id: String((row as { id?: unknown }).id ?? ""),
          type: "egreso",
          amount: -Math.abs(Number((row as { amount?: unknown }).amount ?? 0)),
          date: formatDateInputValue(
            new Date(String((row as { spent_at?: unknown }).spent_at))
          ),
          category: String((row as { category?: unknown }).category ?? ""),
          description: String((row as { description?: unknown }).description ?? ""),
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
        }))

        const incomes: MovementItem[] = (incomeRows ?? []).map((row) => ({
          id: String((row as { id?: unknown }).id ?? ""),
          type: "ingreso",
          amount: Math.abs(Number((row as { amount?: unknown }).amount ?? 0)),
          date: formatDateInputValue(
            new Date(String((row as { received_at?: unknown }).received_at))
          ),
          category: String((row as { category?: unknown }).category ?? ""),
          description: String((row as { description?: unknown }).description ?? ""),
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
        }))

        const merged = [...expenses, ...incomes].filter(
          (x) => x.id && Number.isFinite(x.amount) && x.date
        )
        merged.sort((a, b) => b.date.localeCompare(a.date))
        setItems(merged)
      } catch {
        if (cancelled) return
        setNotice("No se pudo cargar el historial desde Supabase.")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase])

  const totals = React.useMemo(() => {
    let ingresos = 0
    let egresos = 0

    for (const it of items) {
      if (it.type === "ingreso") ingresos += it.amount
      else egresos += Math.abs(it.amount)
    }

    return {
      ingresos,
      egresos,
      balance: ingresos - egresos,
    }
  }, [items])

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
                    <BreadcrumbPage>Historial</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-sm text-muted-foreground">Ingresos</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {moneyFormatter.format(totals.ingresos)}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-sm text-muted-foreground">Egresos</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    -{moneyFormatter.format(totals.egresos)}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatSignedMoney(totals.balance)}
                  </div>
                </div>
              </div>

              {notice ? (
                <div className="text-sm text-muted-foreground">{notice}</div>
              ) : null}
              {error ? <div className="text-sm text-destructive">{error}</div> : null}

              <div className="rounded-xl bg-muted/40 p-3">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aún no hay movimientos registrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[840px] overflow-hidden rounded-lg border border-input bg-background/60">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">
                              Monto (MXN)
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Fecha
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Tipo
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Categoría
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Descripción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {items.map((it) => (
                            <tr key={`${it.type}:${it.id}`}>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {formatSignedMoney(it.amount)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">{it.date}</td>
                              <td className="px-3 py-2">
                                {it.type === "ingreso" ? "Ingreso" : "Egreso"}
                              </td>
                              <td className="px-3 py-2">{it.category}</td>
                              <td className="px-3 py-2">
                                {it.description || "Sin descripción"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
