"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Calendar } from "@/SaaS/dashboard/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/SaaS/dashboard/components/ui/dialog"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"
import { Button } from "@/SaaS/dashboard/components/ui/button"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/SaaS/dashboard/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/SaaS/dashboard/components/ui/select"
import { Textarea } from "@/SaaS/dashboard/components/ui/textarea"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"

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

function parseDateInputValue(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateLabel(value: string) {
  const date = parseDateInputValue(value)
  if (!date) return ""
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return value
  }
}

function getLocalStorageKey(userId?: string, tenantId?: string) {
  const uid = userId ?? "anon"
  const tid = tenantId ?? "personal"
  return `mwcore.ingresos.${tid}.${uid}`
}

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
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

const defaultCategories = ["Salario", "Ventas", "Servicios", "Intereses", "Otros"]

const TABLE_NAME = process.env.NEXT_PUBLIC_INCOMES_TABLE ?? "ingresos"
const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

export default function RegistrarIngresosPage() {
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

  const formatMoney = React.useCallback(
    (raw: string) => {
      const n = Number(raw)
      if (!Number.isFinite(n)) return raw
      return moneyFormatter.format(n)
    },
    [moneyFormatter]
  )

  const [session, setSession] = React.useState<Session | null>(null)
  const [tenantId, setTenantId] = React.useState<string | null>(null)
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
  const [addOpen, setAddOpen] = React.useState(false)

  React.useEffect(() => {
    setItems(loadLocalIncomes(getLocalStorageKey()))
  }, [])

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
            setNotice("No se pudieron cargar datos desde Supabase.")
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
              setNotice("No se pudieron cargar datos desde Supabase.")
              setError(createTenantError.message)
              return
            }

            resolvedTenantId = String((createdTenant as { id?: unknown }).id ?? "")
            if (!resolvedTenantId) {
              setNotice("No se pudieron cargar datos desde Supabase.")
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
              setNotice("No se pudieron cargar datos desde Supabase.")
              setError(memberInsertError.message)
              return
            }
          }
        }

        setTenantId(resolvedTenantId)
        if (resolvedTenantId && typeof window !== "undefined") {
          window.localStorage.setItem(getActiveTenantKey(session.user.id), resolvedTenantId)
        }

        const baseQuery = supabase
          .from(TABLE_NAME)
          .select("id, amount, category, description, received_at, created_at")
          .order("received_at", { ascending: false })
          .limit(20)

        let { data, error } =
          resolvedTenantId && resolvedTenantId !== "null"
            ? await baseQuery.eq("tenant_id", resolvedTenantId)
            : await baseQuery.eq("user_id", session.user.id)

        if (cancelled) return

        if (
          error &&
          resolvedTenantId &&
          resolvedTenantId !== "null" &&
          isMissingSchemaError(error.message)
        ) {
          ;({ data, error } = await baseQuery.eq("user_id", session.user.id))
        }

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
        saveLocalIncomes(
          getLocalStorageKey(session.user.id, resolvedTenantId ?? "personal"),
          mapped
        )
      } catch {
        if (cancelled) return
        setNotice("No se pudieron cargar datos desde Supabase.")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase])

  async function submitIncome() {
    setNotice(null)
    setError(null)

    const amountNumber = Number(draft.amount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Monto inválido.")
      return false
    }
    if (!draft.date) {
      setError("Selecciona una fecha.")
      return false
    }
    if (session && (!tenantId || tenantId === "null")) {
      setError("No se pudo determinar el tenant (espacio).")
      setNotice("No se pudo guardar en Supabase. Guardado localmente.")

      const fallbackItem: IncomeItem = {
        ...draft,
        amount: String(amountNumber),
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
      }

      setItems((prev) => {
        const next = [fallbackItem, ...prev]
        saveLocalIncomes(getLocalStorageKey(session.user.id, tenantId ?? "personal"), next)
        return next
      })

      return true
    }

    setBusy(true)
    try {
      if (session) {
        if (!supabase) {
          setError("Supabase no está configurado.")
          setNotice("No se pudo guardar en Supabase. Guardado localmente.")
          return false
        }

        const payload = {
          amount: amountNumber,
          category: draft.category,
          description: draft.description,
          received_at: new Date(`${draft.date}T00:00:00.000Z`).toISOString(),
          user_id: session.user.id,
        }

        const insertPayload = { ...payload, tenant_id: tenantId }

        let { data, error } = await supabase
          .from(TABLE_NAME)
          .insert(insertPayload)
          .select("id, amount, category, description, received_at, created_at")
          .single()

        if (
          error &&
          tenantId &&
          tenantId !== "null" &&
          isMissingSchemaError(error.message)
        ) {
          ;({ data, error } = await supabase
            .from(TABLE_NAME)
            .insert(payload)
            .select("id, amount, category, description, received_at, created_at")
            .single())
        }

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
            saveLocalIncomes(
              getLocalStorageKey(session.user.id, tenantId ?? "personal"),
              next
            )
            return next
          })
          return true
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
            saveLocalIncomes(
              getLocalStorageKey(session.user.id, tenantId ?? "personal"),
              next
            )
            return next
          })

          setNotice("Ingreso registrado en Supabase.")
          return true
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
        return true
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
      return false
    } finally {
      setBusy(false)
      setDraft((prev) => ({
        ...prev,
        amount: "",
        description: "",
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submitIncome()
    if (ok) setAddOpen(false)
  }

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
                <BreadcrumbPage>Registrar ingresos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">
              Registrar ingresos
            </div>
            <div className="text-sm text-muted-foreground">
              Registra tus ingresos y revisa el historial del mes.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {notice ? notice : session ? "Con sesión activa" : "Sin sesión"}
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setError(null)
                setNotice(null)
                setAddOpen(true)
              }}
              className="rounded-full bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
            >
              Agregar ingreso
            </Button>
          </div>

          {error ? (
            <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Agregar ingreso</DialogTitle>
                <DialogDescription>
                  Completa los datos para registrar tu ingreso.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1 md:col-span-1">
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
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="grid gap-1 md:col-span-1">
                    <div className="text-sm font-medium">Categoría</div>
                    <Select
                      value={draft.category}
                      onValueChange={(value) =>
                        setDraft((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {defaultCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1 md:col-span-1">
                    <div className="text-sm font-medium">Fecha</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full justify-between rounded-xl font-normal"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span
                              className={cn(
                                "min-w-0 truncate",
                                draft.date ? "" : "text-muted-foreground"
                              )}
                            >
                              {draft.date
                                ? formatDateLabel(draft.date)
                                : "Selecciona fecha"}
                            </span>
                          </span>
                          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={8}
                        className="w-auto p-0 overflow-hidden"
                      >
                        <Calendar
                          mode="single"
                          selected={parseDateInputValue(draft.date) ?? undefined}
                          onSelect={(date) => {
                            if (!date) return
                            setDraft((prev) => ({
                              ...prev,
                              date: formatDateInputValue(date),
                            }))
                          }}
                        />
                      </PopoverContent>
                    </Popover>
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
                    className="rounded-xl"
                  />
                </div>

                <DialogFooter className="rounded-b-2xl">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
                  >
                    {busy ? "Guardando…" : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Historial</div>
              <div className="text-xs text-muted-foreground">
                {items.length > 0 ? `${items.length} registros` : "Sin registros"}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay ingresos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[680px] overflow-hidden rounded-2xl border border-input bg-background/70 shadow-sm ring-1 ring-border">
                  <div className="grid grid-cols-12 gap-2 border-b border-border bg-background/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <div className="col-span-3 text-right">Monto</div>
                    <div className="col-span-3">Fecha</div>
                    <div className="col-span-3">Categoría</div>
                    <div className="col-span-3">Descripción</div>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="col-span-3 text-right font-semibold tabular-nums text-primary">
                          {formatMoney(it.amount)}
                        </div>
                        <div className="col-span-3 tabular-nums text-muted-foreground">
                          {it.date}
                        </div>
                        <div className="col-span-3">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {it.category}
                          </span>
                        </div>
                        <div className="col-span-3 text-muted-foreground">
                          {it.description || "Sin descripción"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
