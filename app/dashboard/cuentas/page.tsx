"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import * as React from "react"

import { CreditCard } from "@/components/shared-assets/credit-card/credit-card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/SaaS/dashboard/components/ui/select"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/SaaS/dashboard/components/ui/sidebar"
import { TooltipProvider } from "@/SaaS/dashboard/components/ui/tooltip"

type CardKind = "credit" | "debit"

type CardDraft = {
  kind: CardKind
  company: string
  holder: string
  number: string
  exp: string
}

type SavedCard = {
  id: string
  kind: CardKind
  company: string
  holder: string
  last4: string
  exp: string
  createdAt: string
}

const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"
const CARDS_TABLE = process.env.NEXT_PUBLIC_CARDS_TABLE ?? "cards"

const CREDIT_VISUAL_TYPES = [
  "brand-dark",
  "gradient-strip",
  "salmon-strip",
  "transparent-gradient",
  "gradient-strip-vertical",
  "salmon-strip-vertical",
  "gray-dark",
  "gray-strip",
] as const

const DEBIT_VISUAL_TYPES = [
  "brand-light",
  "gray-light",
  "transparent-strip",
  "gray-strip-vertical",
  "gradient-strip",
  "transparent",
] as const

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

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
}

function getCardsStorageKey(userId?: string, tenantId?: string) {
  const uid = userId ?? "anon"
  const tid = tenantId ?? "personal"
  return `mwcore.cards.${tid}.${uid}`
}

function sanitizeCardNumber(raw: string) {
  return raw.replace(/\D/g, "")
}

function formatMaskedCardNumber(last4: string) {
  const safeLast4 = last4.padStart(4, "•").slice(-4)
  return `•••• •••• •••• ${safeLast4}`
}

function formatExpValue(raw: string) {
  const m = raw.match(/^(\d{4})-(\d{2})$/)
  if (!m) return ""
  const yy = m[1]?.slice(-2) ?? ""
  const mm = m[2] ?? ""
  return `${mm}/${yy}`
}

function hashToIndex(seed: string, size: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return size > 0 ? h % size : 0
}

function getCardVisualType(kind: CardKind, seed: string) {
  const types = kind === "credit" ? CREDIT_VISUAL_TYPES : DEBIT_VISUAL_TYPES
  return types[hashToIndex(seed, types.length)]
}

function parseExpParts(raw: string) {
  const m = raw.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const yyyy = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null
  return { expYear: yyyy, expMonth: mm }
}

function loadLocalCards(key: string): SavedCard[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCard[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveLocalCards(key: string, items: SavedCard[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(items))
}

export default function CuentasPage() {
  const supabase = React.useMemo(() => {
    try {
      const { url, key } = getSupabaseConfig()
      return createClient(url, key)
    } catch {
      return null
    }
  }, [])

  const [session, setSession] = React.useState<Session | null>(null)
  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [cards, setCards] = React.useState<SavedCard[]>(() =>
    loadLocalCards(getCardsStorageKey())
  )
  const [draft, setDraft] = React.useState<CardDraft>(() => ({
    kind: "credit",
    company: "Banco",
    holder: "",
    number: "",
    exp: "",
  }))
  const [busy, setBusy] = React.useState(false)
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
    const uid = session?.user.id
    const tid = tenantId ?? "personal"
    const key = getCardsStorageKey(uid, tid)
    setCards(loadLocalCards(key))
  }, [session, tenantId])

  React.useEffect(() => {
    if (!supabase || !session || !tenantId || tenantId === "null") return

    let cancelled = false

    const run = async () => {
      const { data, error } = await supabase
        .from(CARDS_TABLE)
        .select("id, kind, company, holder, last4, exp_month, exp_year, created_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (cancelled) return

      if (error) {
        if (!isMissingSchemaError(error.message)) {
          setNotice("No se pudieron cargar tarjetas desde Supabase.")
          setError(error.message)
        }
        return
      }

      const mapped: SavedCard[] = (data ?? []).map((row) => {
        const expMonth = Number((row as { exp_month?: unknown }).exp_month ?? 0)
        const expYear = Number((row as { exp_year?: unknown }).exp_year ?? 0)
        const exp =
          expMonth >= 1 && expMonth <= 12 && expYear >= 2000
            ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
            : String((row as { exp?: unknown }).exp ?? "")

        return {
          id: String((row as { id?: unknown }).id ?? crypto.randomUUID()),
          kind: (String((row as { kind?: unknown }).kind ?? "credit") === "debit"
            ? "debit"
            : "credit") as CardKind,
          company: String((row as { company?: unknown }).company ?? "Banco"),
          holder: String((row as { holder?: unknown }).holder ?? "").toUpperCase(),
          last4: String((row as { last4?: unknown }).last4 ?? ""),
          exp: exp || "MM/YY",
          createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
        }
      })

      setCards(mapped)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase, tenantId])

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
      } catch (e) {
        if (cancelled) return
        setNotice("No se pudieron cargar datos desde Supabase.")
        setError(e instanceof Error ? e.message : "Error desconocido")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase])

  const preview = React.useMemo(() => {
    const digits = sanitizeCardNumber(draft.number)
    const last4 = digits.slice(-4)
    const exp = formatExpValue(draft.exp) || "MM/YY"
    const holder = (draft.holder || "NOMBRE APELLIDO").toUpperCase()
    const company = draft.company || "Banco"

    return {
      company,
      holder,
      exp,
      cardNumber: last4 ? formatMaskedCardNumber(last4) : "•••• •••• •••• ••••",
      type: getCardVisualType(
        draft.kind,
        `${draft.kind}|${company}|${holder}|${digits}|${draft.exp}`
      ),
    }
  }, [draft.company, draft.exp, draft.holder, draft.kind, draft.number])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    setError(null)

    const digits = sanitizeCardNumber(draft.number)
    if (digits.length < 12) {
      setError("Número de tarjeta inválido.")
      return
    }
    const last4 = digits.slice(-4)
    if (!last4) {
      setError("Número de tarjeta inválido.")
      return
    }
    const expParts = parseExpParts(draft.exp)
    const exp = formatExpValue(draft.exp)
    if (!exp || !expParts) {
      setError("Selecciona la fecha de expiración.")
      return
    }
    const holder = draft.holder.trim()
    if (!holder) {
      setError("Nombre del titular requerido.")
      return
    }

    setBusy(true)
    try {
      const uid = session?.user.id
      const tid = tenantId ?? "personal"
      const key = getCardsStorageKey(uid, tid)

      if (supabase && session && tenantId && tenantId !== "null") {
        const payload = {
          kind: draft.kind,
          company: draft.company.trim() || "Banco",
          holder: holder.toUpperCase(),
          last4,
          exp_month: expParts.expMonth,
          exp_year: expParts.expYear,
          tenant_id: tenantId,
          user_id: session.user.id,
        }

        const { data, error } = await supabase
          .from(CARDS_TABLE)
          .insert(payload)
          .select("id, kind, company, holder, last4, exp_month, exp_year, created_at")
          .single()

        if (error || !data) {
          if (!isMissingSchemaError(error?.message ?? "")) {
            setError(error?.message ?? "Respuesta vacía de Supabase.")
          }
          setNotice("No se pudo guardar en Supabase. Guardado localmente.")

          const item: SavedCard = {
            id: crypto.randomUUID(),
            kind: draft.kind,
            company: payload.company,
            holder: payload.holder,
            last4,
            exp,
            createdAt: new Date().toISOString(),
          }

          setCards((prev) => {
            const next = [item, ...prev]
            saveLocalCards(key, next)
            return next
          })
        } else {
          const expMonth = Number((data as { exp_month?: unknown }).exp_month ?? 0)
          const expYear = Number((data as { exp_year?: unknown }).exp_year ?? 0)
          const expFromDb =
            expMonth >= 1 && expMonth <= 12 && expYear >= 2000
              ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
              : exp

          const saved: SavedCard = {
            id: String((data as { id?: unknown }).id ?? crypto.randomUUID()),
            kind: (String((data as { kind?: unknown }).kind ?? "credit") === "debit"
              ? "debit"
              : "credit") as CardKind,
            company: String((data as { company?: unknown }).company ?? "Banco"),
            holder: String((data as { holder?: unknown }).holder ?? holder).toUpperCase(),
            last4: String((data as { last4?: unknown }).last4 ?? last4),
            exp: expFromDb,
            createdAt: String(
              (data as { created_at?: unknown }).created_at ?? new Date().toISOString()
            ),
          }

          setCards((prev) => [saved, ...prev])
          setNotice("Tarjeta agregada en Supabase.")
        }
      } else {
        const item: SavedCard = {
          id: crypto.randomUUID(),
          kind: draft.kind,
          company: (draft.company.trim() || "Banco").trim(),
          holder: holder.toUpperCase(),
          last4,
          exp,
          createdAt: new Date().toISOString(),
        }

        setCards((prev) => {
          const next = [item, ...prev]
          saveLocalCards(key, next)
          return next
        })
        setNotice("Tarjeta agregada.")
      }

      setDraft((prev) => ({
        ...prev,
        holder: "",
        number: "",
        exp: "",
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
                    <BreadcrumbPage>Mi cuenta</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid gap-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Vista previa
                  </div>
                  <div className="rounded-xl bg-muted/30 p-4">
                    <CreditCard
                      width={360}
                      company={preview.company}
                      cardHolder={preview.holder}
                      cardExpiration={preview.exp}
                      cardNumber={preview.cardNumber}
                      type={preview.type}
                      className="mx-auto"
                    />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div className="text-sm font-medium">Agregar tarjeta</div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-1">
                      <div className="text-sm font-medium">Tipo</div>
                      <Select
                        value={draft.kind}
                        onValueChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            kind: value === "debit" ? "debit" : "credit",
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <div className="text-sm font-medium">Banco</div>
                      <Input
                        value={draft.company}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, company: e.target.value }))
                        }
                        placeholder="Ej. BBVA"
                      />
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <div className="text-sm font-medium">Titular</div>
                    <Input
                      value={draft.holder}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, holder: e.target.value }))
                      }
                      placeholder="Nombre y apellido"
                      autoComplete="cc-name"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-1">
                      <div className="text-sm font-medium">Número</div>
                      <Input
                        value={draft.number}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, number: e.target.value }))
                        }
                        placeholder="1234 1234 1234 1234"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                    </div>
                    <div className="grid gap-1">
                      <div className="text-sm font-medium">Expira</div>
                      <Input
                        type="month"
                        value={draft.exp}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, exp: e.target.value }))
                        }
                        autoComplete="cc-exp"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {notice ? notice : session ? "Con sesión activa" : "Sin sesión"}
                    </div>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Guardando…" : "Agregar"}
                    </Button>
                  </div>

                  {error ? <div className="text-sm text-destructive">{error}</div> : null}
                </form>
              </div>

              <div className="grid gap-3">
                <div className="text-sm font-medium">Mis tarjetas</div>
                {cards.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aún no has agregado tarjetas.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((c) => (
                      <div key={c.id} className="rounded-xl bg-muted/30 p-3">
                        <CreditCard
                          width={320}
                          company={c.company}
                          cardHolder={c.holder}
                          cardExpiration={c.exp}
                          cardNumber={formatMaskedCardNumber(c.last4)}
                          type={getCardVisualType(c.kind, `${c.kind}|${c.id}|${c.last4}`)}
                          className="mx-auto"
                        />
                      </div>
                    ))}
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
