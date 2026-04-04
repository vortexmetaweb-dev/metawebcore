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
import { Button } from "@/SaaS/dashboard/components/ui/button"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Textarea } from "@/SaaS/dashboard/components/ui/textarea"

type IncomeDraft = {
  amount: string
  category: string
  date: string
  description: string
}

type IncomeItem = IncomeDraft & {
  id: string
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

function formatDateInputValue(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getLocalStorageKey(userId?: string) {
  const uid = userId ?? "anon"
  return `mwcore.ingresos.personal.${uid}`
}

function loadLocalIncomes(key: string): IncomeItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as IncomeItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveLocalIncomes(key: string, items: IncomeItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(items))
}

const defaultCategories = ["Salario", "Ventas", "Servicios", "Intereses", "Otros"]

const TABLE_NAME = process.env.NEXT_PUBLIC_INCOMES_TABLE ?? "ingresos"

export default function RegistrarIngresosPage() {
  const moneyFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }),
    []
  )

  const formatMoney = React.useCallback(
    (raw: string) => {
      const n = Number(raw)
      if (!Number.isFinite(n)) return raw
      return moneyFormatter.format(n)
    },
    [moneyFormatter]
  )

  const [session, setSession] = React.useState<Session | null>(null)
  const [draft, setDraft] = React.useState<IncomeDraft>(() => ({
    amount: "",
    category: defaultCategories[0],
    date: formatDateInputValue(new Date()),
    description: "",
  }))
  const [items, setItems] = React.useState<IncomeItem[]>(() => [])
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setItems(loadLocalIncomes(getLocalStorageKey()))
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

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select("id, amount, category, description, received_at, created_at")
          .eq("user_id", session.user.id)
          .order("received_at", { ascending: false })
          .limit(20)

        if (cancelled) return

        if (error) {
          setNotice("No se pudieron cargar ingresos desde Supabase.")
          setError(error.message)
          return
        }

        const mapped: IncomeItem[] = (data ?? []).map((row) => ({
          amount: String((row as { amount?: unknown }).amount ?? ""),
          category: String((row as { category?: unknown }).category ?? ""),
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
          date: formatDateInputValue(
            new Date(String((row as { received_at?: unknown }).received_at))
          ),
          description: String((row as { description?: unknown }).description ?? ""),
          id: String((row as { id?: unknown }).id ?? ""),
        }))

        setItems(mapped)
        saveLocalIncomes(getLocalStorageKey(session.user.id), mapped)
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

    setBusy(true)
    try {
      if (session) {
        const { url, key } = getSupabaseConfig()
        const supabase = createClient(url, key)
        const payload = {
          amount: amountNumber,
          category: draft.category,
          description: draft.description,
          received_at: new Date(`${draft.date}T00:00:00.000Z`).toISOString(),
          user_id: session.user.id,
        }

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert(payload)
          .select("id, amount, category, description, received_at, created_at")
          .single()

        if (error || !data) {
          setError(error?.message ?? "Respuesta vacía de Supabase.")
          setNotice("No se pudo guardar en Supabase. Guardado localmente.")

          const fallbackItem: IncomeItem = {
            ...draft,
            amount: String(amountNumber),
            createdAt: new Date().toISOString(),
            id: crypto.randomUUID(),
          }

          setItems((prev) => {
            const next = [fallbackItem, ...prev]
            saveLocalIncomes(getLocalStorageKey(session.user.id), next)
            return next
          })
        } else {
          const savedItem: IncomeItem = {
            amount: String((data as { amount?: unknown }).amount ?? amountNumber),
            category: String((data as { category?: unknown }).category ?? draft.category),
            createdAt: String(
              (data as { created_at?: unknown }).created_at ?? new Date().toISOString()
            ),
            date: formatDateInputValue(
              new Date(String((data as { received_at?: unknown }).received_at))
            ),
            description: String(
              (data as { description?: unknown }).description ?? draft.description
            ),
            id: String((data as { id?: unknown }).id ?? crypto.randomUUID()),
          }

          setItems((prev) => {
            const next = [savedItem, ...prev]
            saveLocalIncomes(getLocalStorageKey(session.user.id), next)
            return next
          })

          setNotice("Ingreso registrado en Supabase.")
        }
      } else {
        const localItem: IncomeItem = {
          ...draft,
          amount: String(amountNumber),
          createdAt: new Date().toISOString(),
          id: crypto.randomUUID(),
        }

        setItems((prev) => {
          const next = [localItem, ...prev]
          saveLocalIncomes(getLocalStorageKey(), next)
          return next
        })

        setNotice("Ingreso guardado localmente (sin sesión).")
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
                    <BreadcrumbPage>Registrar ingresos</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
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
                    placeholder="Ej. Pago de cliente, salario, etc."
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

                {error ? <div className="text-sm text-destructive">{error}</div> : null}
              </form>

              <div className="rounded-xl bg-muted/40 p-3">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aún no hay ingresos registrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[680px] overflow-hidden rounded-lg border border-input bg-background/60">
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
                              Categoría
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Descripción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {items.map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {formatMoney(it.amount)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">{it.date}</td>
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
