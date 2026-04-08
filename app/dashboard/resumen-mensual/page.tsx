"use client"

import * as React from "react"
import { createClient, type Session } from "@supabase/supabase-js"

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
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"

type IncomeRow = {
  amount: number
  category: string
  description: string
  receivedAt: string
}

type ExpenseRow = {
  amount: number
  category: string
  description: string
  spentAt: string
}

type TenantMemberRow = { tenant_id?: unknown }

const EXPENSES_TABLE = process.env.NEXT_PUBLIC_EXPENSES_TABLE ?? "egresos"
const INCOMES_TABLE = process.env.NEXT_PUBLIC_INCOMES_TABLE ?? "ingresos"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) return null
  return { url, key }
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

function getCurrentMonthValue() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function getMonthRange(month: string) {
  const [yRaw, mRaw] = month.split("-")
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const fallback = getCurrentMonthValue()
    return getMonthRange(fallback)
  }

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function sumByCategory<T extends { category: string; amount: number }>(rows: T[]) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const key = r.category || "Sin categoría"
    map.set(key, (map.get(key) ?? 0) + (Number.isFinite(r.amount) ? r.amount : 0))
  }
  const list = Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
  return list
}

function formatMoneyMXN(value: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return String(value)
  }
}

function parseLocalRows<T>(
  raw: string | null,
  mapper: (row: Record<string, unknown>) => T | null
) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => (v && typeof v === "object" ? mapper(v as Record<string, unknown>) : null))
      .filter(Boolean) as T[]
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

export default function ResumenMensualPage() {
  const supabase = React.useMemo(() => {
    const cfg = getSupabaseConfig()
    if (!cfg) return null
    return createClient(cfg.url, cfg.key)
  }, [])

  const [month, setMonth] = React.useState<string>(() => getCurrentMonthValue())
  const [session, setSession] = React.useState<Session | null>(null)
  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [incomes, setIncomes] = React.useState<IncomeRow[]>([])
  const [expenses, setExpenses] = React.useState<ExpenseRow[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

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

    const resolveTenant = async () => {
      const stored =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(getActiveTenantKey(session.user.id))

      const { data: memberRows, error: memberError } = await supabase
        .from(TENANT_MEMBERS_TABLE)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })

      if (cancelled) return

      if (memberError) {
        if (!isMissingSchemaError(memberError.message)) {
          setTenantId(null)
          setNotice("No se pudo resolver el espacio activo.")
          setError(memberError.message)
          return
        }
        setTenantId(null)
        return
      }

      const tenantIds = (memberRows ?? [])
        .map((r) => String((r as TenantMemberRow).tenant_id ?? ""))
        .filter(Boolean)

      const nextTenantId =
        (stored && tenantIds.includes(stored) && stored) || tenantIds[0] || null

      setTenantId(nextTenantId)
    }

    resolveTenant()

    const onTenantChange = () => {
      resolveTenant()
    }

    window.addEventListener("mwcore:tenant-change", onTenantChange)
    return () => {
      cancelled = true
      window.removeEventListener("mwcore:tenant-change", onTenantChange)
    }
  }, [session, supabase])

  React.useEffect(() => {
    if (!session) {
      setIncomes([])
      setExpenses([])
      return
    }

    const { startISO, endISO, startDate, endDate } = getMonthRange(month)
    const uid = session.user.id
    const tid = tenantId ?? "personal"

    const loadFromLocal = () => {
      const localIncomes = parseLocalRows<IncomeRow>(
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(getLocalIncomesKey(uid, tid)),
        (row) => {
          const amount = Number(row.amount)
          const category = typeof row.category === "string" ? row.category : ""
          const description = typeof row.description === "string" ? row.description : ""
          const receivedAt = typeof row.date === "string" ? row.date : ""
          if (!receivedAt) return null
          if (receivedAt < startDate || receivedAt >= endDate) return null
          return {
            amount: Number.isFinite(amount) ? amount : 0,
            category,
            description,
            receivedAt,
          }
        }
      )

      const localExpenses = parseLocalRows<ExpenseRow>(
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(getLocalExpensesKey(uid, tid)),
        (row) => {
          const amount = Number(row.amount)
          const category = typeof row.category === "string" ? row.category : ""
          const description = typeof row.description === "string" ? row.description : ""
          const spentAt = typeof row.date === "string" ? row.date : ""
          if (!spentAt) return null
          if (spentAt < startDate || spentAt >= endDate) return null
          return {
            amount: Number.isFinite(amount) ? amount : 0,
            category,
            description,
            spentAt,
          }
        }
      )

      setIncomes(localIncomes)
      setExpenses(localExpenses)
    }

    if (!supabase) {
      loadFromLocal()
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setNotice(null)
      setError(null)
      try {
        const incomesQuery = supabase
          .from(INCOMES_TABLE)
          .select("amount, category, description, received_at")
          .order("received_at", { ascending: true })

        const expensesQuery = supabase
          .from(EXPENSES_TABLE)
          .select("amount, category, description, spent_at")
          .order("spent_at", { ascending: true })

        const incomesRes =
          tenantId && tenantId !== "null"
            ? await incomesQuery
                .eq("tenant_id", tenantId)
                .gte("received_at", startISO)
                .lt("received_at", endISO)
            : await incomesQuery
                .eq("user_id", uid)
                .gte("received_at", startISO)
                .lt("received_at", endISO)

        const expensesRes =
          tenantId && tenantId !== "null"
            ? await expensesQuery
                .eq("tenant_id", tenantId)
                .gte("spent_at", startISO)
                .lt("spent_at", endISO)
            : await expensesQuery
                .eq("user_id", uid)
                .gte("spent_at", startISO)
                .lt("spent_at", endISO)

        if (cancelled) return

        if (incomesRes.error || expensesRes.error) {
          const errMsg =
            incomesRes.error?.message ?? expensesRes.error?.message ?? "Error desconocido"

          if (isMissingSchemaError(errMsg)) {
            loadFromLocal()
            setNotice("Mostrando datos locales (tablas no disponibles en Supabase).")
            return
          }

          setNotice("No se pudo cargar el resumen mensual desde Supabase.")
          setError(errMsg)
          loadFromLocal()
          return
        }

        const mappedIncomes: IncomeRow[] = (incomesRes.data ?? []).map((r) => ({
          amount: Number((r as { amount?: unknown }).amount ?? 0),
          category: String((r as { category?: unknown }).category ?? ""),
          description: String((r as { description?: unknown }).description ?? ""),
          receivedAt: String((r as { received_at?: unknown }).received_at ?? ""),
        }))

        const mappedExpenses: ExpenseRow[] = (expensesRes.data ?? []).map((r) => ({
          amount: Number((r as { amount?: unknown }).amount ?? 0),
          category: String((r as { category?: unknown }).category ?? ""),
          description: String((r as { description?: unknown }).description ?? ""),
          spentAt: String((r as { spent_at?: unknown }).spent_at ?? ""),
        }))

        setIncomes(mappedIncomes.filter((r) => Number.isFinite(r.amount)))
        setExpenses(mappedExpenses.filter((r) => Number.isFinite(r.amount)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [month, session, supabase, tenantId])

  const totals = React.useMemo(() => {
    const incomeTotal = incomes.reduce((acc, r) => acc + (r.amount || 0), 0)
    const expenseTotal = expenses.reduce((acc, r) => acc + (r.amount || 0), 0)
    return {
      incomeTotal,
      expenseTotal,
      net: incomeTotal - expenseTotal,
    }
  }, [incomes, expenses])

  const expenseByCategory = React.useMemo(
    () => sumByCategory(expenses).slice(0, 6),
    [expenses]
  )
  const incomeByCategory = React.useMemo(
    () => sumByCategory(incomes).slice(0, 6),
    [incomes]
  )

  const maxExpenseCategory = expenseByCategory[0]?.total ?? 0
  const maxIncomeCategory = incomeByCategory[0]?.total ?? 0

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
                <BreadcrumbPage>Resumen Mensual</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-1">
              <div className="text-sm font-medium">Mes</div>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMonth(getCurrentMonthValue())}
              >
                Ir a este mes
              </Button>
            </div>
          </div>

          {notice || error ? (
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <div className="text-foreground">{notice ?? "Error"}</div>
              {error ? (
                <div className="mt-1 text-xs text-muted-foreground">{error}</div>
              ) : null}
            </div>
          ) : null}

          {!session ? (
            <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
              Inicia sesión para ver tu resumen mensual.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Ingresos</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMoneyMXN(totals.incomeTotal)}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Egresos</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMoneyMXN(totals.expenseTotal)}
                  </div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div
                    className={
                      totals.net < 0
                        ? "mt-1 text-lg font-semibold text-destructive tabular-nums"
                        : "mt-1 text-lg font-semibold tabular-nums"
                    }
                  >
                    {formatMoneyMXN(totals.net)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-sm font-medium">Egresos por categoría</div>
                  <div className="mt-3 grid gap-2">
                    {expenseByCategory.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Sin egresos en este mes.
                      </div>
                    ) : (
                      expenseByCategory.map((c) => {
                        const pct =
                          maxExpenseCategory > 0
                            ? Math.round((c.total / maxExpenseCategory) * 100)
                            : 0
                        return (
                          <div key={c.category} className="grid gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm">{c.category}</div>
                              <div className="shrink-0 text-sm tabular-nums">
                                {formatMoneyMXN(c.total)}
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-background/60">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="text-sm font-medium">Ingresos por categoría</div>
                  <div className="mt-3 grid gap-2">
                    {incomeByCategory.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Sin ingresos en este mes.
                      </div>
                    ) : (
                      incomeByCategory.map((c) => {
                        const pct =
                          maxIncomeCategory > 0
                            ? Math.round((c.total / maxIncomeCategory) * 100)
                            : 0
                        return (
                          <div key={c.category} className="grid gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm">{c.category}</div>
                              <div className="shrink-0 text-sm tabular-nums">
                                {formatMoneyMXN(c.total)}
                              </div>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-background/60">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Estado</div>
                  <div className="text-xs text-muted-foreground">
                    {loading ? "Actualizando…" : "Actualizado"}
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Este resumen toma los datos de Ingresos y Egresos del mes seleccionado.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

