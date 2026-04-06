"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import * as React from "react"

import { CreditCard } from "@/components/shared-assets/credit-card/credit-card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Button } from "@/SaaS/dashboard/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/SaaS/dashboard/components/ui/dialog"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { Skeleton } from "@/SaaS/dashboard/components/ui/skeleton"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"

type CardNetwork = "mastercard" | "visa" | "amex" | "unknown"

type SavedCard = {
  id: string
  kind: "credit" | "debit"
  network: CardNetwork
  company: string
  holder: string
  last4: string
  exp: string
  createdAt: string
}

type CreditDetailsDraft = {
  creditLimit: string
  currentBalance: string
  apr: string
  statementDay: string
  dueDay: string
  minPayment: string
}

const TENANTS_TABLE = process.env.NEXT_PUBLIC_TENANTS_TABLE ?? "tenants"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"
const CARDS_TABLE = process.env.NEXT_PUBLIC_CARDS_TABLE ?? "cards"
const CREDIT_DETAILS_TABLE =
  process.env.NEXT_PUBLIC_CREDIT_CARD_DETAILS_TABLE ?? "card_credit_details"

const CARD_GRADIENTS = [
  "bg-linear-to-tr from-indigo-700 to-indigo-500",
  "bg-linear-to-tr from-sky-700 to-sky-500",
  "bg-linear-to-tr from-emerald-700 to-emerald-500",
  "bg-linear-to-tr from-teal-700 to-teal-500",
  "bg-linear-to-tr from-violet-700 to-violet-500",
  "bg-linear-to-tr from-fuchsia-700 to-fuchsia-500",
  "bg-linear-to-tr from-rose-700 to-rose-500",
  "bg-linear-to-tr from-amber-700 to-amber-500",
  "bg-linear-to-tr from-slate-800 to-slate-600",
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

function getCreditDetailsStorageKey(userId: string, tenantId: string, cardId: string) {
  return `mwcore.cardCreditDetails.${tenantId}.${userId}.${cardId}`
}

function loadLocalCards(key: string): SavedCard[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCard[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((c) => {
      const kind =
        (c as { kind?: unknown }).kind === "debit" ? ("debit" as const) : ("credit" as const)
      const networkRaw = String((c as { network?: unknown }).network ?? "unknown")
      const network: CardNetwork =
        networkRaw === "visa" || networkRaw === "amex" || networkRaw === "mastercard"
          ? networkRaw
          : "unknown"

      return {
        id: String((c as { id?: unknown }).id ?? crypto.randomUUID()),
        kind,
        network,
        company: String((c as { company?: unknown }).company ?? "Banco"),
        holder: String((c as { holder?: unknown }).holder ?? "").toUpperCase(),
        last4: String((c as { last4?: unknown }).last4 ?? ""),
        exp: String((c as { exp?: unknown }).exp ?? "MM/YY"),
        createdAt: String((c as { createdAt?: unknown }).createdAt ?? ""),
      }
    })
  } catch {
    return []
  }
}

function loadLocalCreditDetails(key: string): CreditDetailsDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreditDetailsDraft
    if (!parsed || typeof parsed !== "object") return null
    return {
      creditLimit: String((parsed as { creditLimit?: unknown }).creditLimit ?? ""),
      currentBalance: String((parsed as { currentBalance?: unknown }).currentBalance ?? ""),
      apr: String((parsed as { apr?: unknown }).apr ?? ""),
      statementDay: String((parsed as { statementDay?: unknown }).statementDay ?? ""),
      dueDay: String((parsed as { dueDay?: unknown }).dueDay ?? ""),
      minPayment: String((parsed as { minPayment?: unknown }).minPayment ?? ""),
    }
  } catch {
    return null
  }
}

function saveLocalCreditDetails(key: string, value: CreditDetailsDraft) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function hashToIndex(seed: string, size: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return size > 0 ? h % size : 0
}

function getCardBackground(seed: string) {
  return CARD_GRADIENTS[hashToIndex(seed, CARD_GRADIENTS.length)]
}

function CreditCardSkeleton() {
  return (
    <div className="relative h-[192px] w-[320px] overflow-hidden rounded-2xl bg-muted/40">
      <div className="absolute inset-0 bg-linear-to-tr from-muted/50 to-muted" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-4 w-24 bg-black/10" />
          <Skeleton className="h-6 w-5 rounded bg-black/10" />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-2">
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24 bg-black/10" />
              <Skeleton className="h-3 w-10 bg-black/10" />
            </div>
            <Skeleton className="h-4 w-44 bg-black/10" />
          </div>
          <Skeleton className="h-8 w-12 rounded bg-black/10" />
        </div>
      </div>
    </div>
  )
}

function parseNumberOrNull(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseIntOrNull(value: string) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

export default function TarjetasCreditoPage() {
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
  const [cards, setCards] = React.useState<SavedCard[]>(() => loadLocalCards(getCardsStorageKey()))
  const [cardsLoading, setCardsLoading] = React.useState(false)

  const [selectedCard, setSelectedCard] = React.useState<SavedCard | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [detailsBusy, setDetailsBusy] = React.useState(false)
  const [details, setDetails] = React.useState<CreditDetailsDraft>(() => ({
    creditLimit: "",
    currentBalance: "",
    apr: "",
    statementDay: "",
    dueDay: "",
    minPayment: "",
  }))

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

  React.useEffect(() => {
    const uid = session?.user.id
    const tid = tenantId ?? "personal"
    setCards(loadLocalCards(getCardsStorageKey(uid, tid)))
  }, [session, tenantId])

  React.useEffect(() => {
    if (!supabase || !session || !tenantId || tenantId === "null") return

    let cancelled = false

    const run = async () => {
      setCardsLoading(true)
      try {
        const full = await supabase
          .from(CARDS_TABLE)
          .select("id, kind, network, company, holder, last4, exp_month, exp_year, created_at")
          .eq("tenant_id", tenantId)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50)

        if (cancelled) return

        let data: unknown[] | null = full.data as unknown[] | null
        let err = full.error

        if (err && isMissingSchemaError(err.message)) {
          const fallback = await supabase
            .from(CARDS_TABLE)
            .select("id, kind, company, holder, last4, exp_month, exp_year, created_at")
            .eq("tenant_id", tenantId)
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50)
          data = fallback.data as unknown[] | null
          err = fallback.error
        }

        if (cancelled) return

        if (err) {
          if (!isMissingSchemaError(err.message)) {
            setNotice("No se pudieron cargar tarjetas desde Supabase.")
            setError(err.message)
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

          const kind =
            String((row as { kind?: unknown }).kind ?? "credit") === "debit"
              ? ("debit" as const)
              : ("credit" as const)

          const networkRaw = String((row as { network?: unknown }).network ?? "unknown")
          const network: CardNetwork =
            networkRaw === "visa" || networkRaw === "amex" || networkRaw === "mastercard"
              ? networkRaw
              : "unknown"

          return {
            id: String((row as { id?: unknown }).id ?? crypto.randomUUID()),
            kind,
            network,
            company: String((row as { company?: unknown }).company ?? "Banco"),
            holder: String((row as { holder?: unknown }).holder ?? "").toUpperCase(),
            last4: String((row as { last4?: unknown }).last4 ?? ""),
            exp: exp || "MM/YY",
            createdAt: String((row as { created_at?: unknown }).created_at ?? ""),
          }
        })

        setCards(mapped)
      } finally {
        if (!cancelled) setCardsLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [session, supabase, tenantId])

  const creditCards = React.useMemo(
    () => cards.filter((c) => c.kind === "credit"),
    [cards]
  )

  const computed = React.useMemo(() => {
    const limit = parseNumberOrNull(details.creditLimit) ?? 0
    const balance = parseNumberOrNull(details.currentBalance) ?? 0
    const available = Math.max(0, limit - balance)
    return { limit, balance, available }
  }, [details.creditLimit, details.currentBalance])

  const openDetails = async (card: SavedCard) => {
    setSelectedCard(card)
    setDetailsOpen(true)
    setError(null)
    setNotice(null)

    if (!session || !tenantId || tenantId === "null") {
      return
    }

    const localKey = getCreditDetailsStorageKey(session.user.id, tenantId, card.id)
    const local = loadLocalCreditDetails(localKey)
    if (local) setDetails(local)

    if (!supabase) return

    setDetailsBusy(true)
    try {
      const full = await supabase
        .from(CREDIT_DETAILS_TABLE)
        .select(
          "credit_limit, current_balance, apr, statement_day, due_day, min_payment"
        )
        .eq("card_id", card.id)
        .eq("tenant_id", tenantId)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (full.error) {
        if (!isMissingSchemaError(full.error.message)) {
          setError(full.error.message)
        }
        return
      }

      const row = full.data as
        | {
            credit_limit?: unknown
            current_balance?: unknown
            apr?: unknown
            statement_day?: unknown
            due_day?: unknown
            min_payment?: unknown
          }
        | null

      if (!row) return

      setDetails({
        creditLimit: String(row.credit_limit ?? ""),
        currentBalance: String(row.current_balance ?? ""),
        apr: String(row.apr ?? ""),
        statementDay: String(row.statement_day ?? ""),
        dueDay: String(row.due_day ?? ""),
        minPayment: String(row.min_payment ?? ""),
      })
    } finally {
      setDetailsBusy(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!selectedCard || !session || !tenantId || tenantId === "null") return

    setError(null)
    setNotice(null)

    const creditLimit = parseNumberOrNull(details.creditLimit)
    const currentBalance = parseNumberOrNull(details.currentBalance)
    const apr = parseNumberOrNull(details.apr)
    const statementDay = parseIntOrNull(details.statementDay)
    const dueDay = parseIntOrNull(details.dueDay)
    const minPayment = parseNumberOrNull(details.minPayment)

    if (creditLimit === null || creditLimit < 0) {
      setError("Límite de crédito inválido.")
      return
    }
    if (currentBalance === null || currentBalance < 0) {
      setError("Saldo actual inválido.")
      return
    }
    if (statementDay !== null && (statementDay < 1 || statementDay > 31)) {
      setError("Día de corte inválido.")
      return
    }
    if (dueDay !== null && (dueDay < 1 || dueDay > 31)) {
      setError("Día de pago inválido.")
      return
    }

    const localKey = getCreditDetailsStorageKey(session.user.id, tenantId, selectedCard.id)
    saveLocalCreditDetails(localKey, details)

    if (!supabase) {
      setNotice("Guardado localmente.")
      return
    }

    setDetailsBusy(true)
    try {
      const payload = {
        card_id: selectedCard.id,
        tenant_id: tenantId,
        user_id: session.user.id,
        credit_limit: creditLimit,
        current_balance: currentBalance,
        apr: apr,
        statement_day: statementDay,
        due_day: dueDay,
        min_payment: minPayment,
      }

      const { error } = await supabase
        .from(CREDIT_DETAILS_TABLE)
        .upsert(payload, { onConflict: "card_id" })

      if (error) {
        if (!isMissingSchemaError(error.message)) {
          setError(error.message)
          return
        }
        setNotice("Guardado localmente.")
        return
      }

      setNotice("Guardado en Supabase.")
    } finally {
      setDetailsBusy(false)
    }
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
                <BreadcrumbPage>Tarjetas de crédito</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 rounded-xl bg-background p-4">
          {notice ? <div className="text-sm text-muted-foreground">{notice}</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {creditCards.length === 0 ? (
            cardsLoading || (session && !tenantId) ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-3">
                    <CreditCardSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No tienes tarjetas de crédito registradas en Mis Cuentas.
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {creditCards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-xl bg-muted/30 p-3 text-left hover:bg-muted/40"
                  onClick={() => openDetails(c)}
                >
                  <CreditCard
                    width={320}
                    company={c.company}
                    cardHolder={c.holder}
                    cardExpiration={c.exp}
                    cardNumber={`•••• •••• •••• ${c.last4}`}
                    type="brand-dark"
                    network={c.network}
                    backgroundClassName={getCardBackground(`${c.id}|${c.last4}`)}
                    className="mx-auto"
                  />
                </button>
              ))}
              {cardsLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={`loading-${i}`} className="rounded-xl bg-muted/30 p-3">
                      <CreditCardSkeleton />
                    </div>
                  ))
                : null}
            </div>
          )}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar tarjeta</DialogTitle>
          </DialogHeader>

          {selectedCard ? (
            <div className="grid gap-4">
              <div className="rounded-xl bg-muted/30 p-3">
                <CreditCard
                  width={360}
                  company={selectedCard.company}
                  cardHolder={selectedCard.holder}
                  cardExpiration={selectedCard.exp}
                  cardNumber={`•••• •••• •••• ${selectedCard.last4}`}
                  type="brand-dark"
                  network={selectedCard.network}
                  backgroundClassName={getCardBackground(
                    `${selectedCard.id}|${selectedCard.last4}`
                  )}
                  className="mx-auto"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">Límite de crédito</div>
                  <Input
                    inputMode="decimal"
                    value={details.creditLimit}
                    onChange={(e) =>
                      setDetails((prev) => ({ ...prev, creditLimit: e.target.value }))
                    }
                    placeholder="Ej. 20000"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Saldo actual</div>
                  <Input
                    inputMode="decimal"
                    value={details.currentBalance}
                    onChange={(e) =>
                      setDetails((prev) => ({
                        ...prev,
                        currentBalance: e.target.value,
                      }))
                    }
                    placeholder="Ej. 3500"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Disponible</div>
                  <Input
                    value={String(computed.available)}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">APR % (opcional)</div>
                  <Input
                    inputMode="decimal"
                    value={details.apr}
                    onChange={(e) =>
                      setDetails((prev) => ({ ...prev, apr: e.target.value }))
                    }
                    placeholder="Ej. 49.9"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Día de corte</div>
                  <Input
                    inputMode="numeric"
                    value={details.statementDay}
                    onChange={(e) =>
                      setDetails((prev) => ({
                        ...prev,
                        statementDay: e.target.value,
                      }))
                    }
                    placeholder="1-31"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Día de pago</div>
                  <Input
                    inputMode="numeric"
                    value={details.dueDay}
                    onChange={(e) =>
                      setDetails((prev) => ({ ...prev, dueDay: e.target.value }))
                    }
                    placeholder="1-31"
                  />
                </div>

                <div className="grid gap-1 md:col-span-2">
                  <div className="text-sm font-medium">Pago mínimo (opcional)</div>
                  <Input
                    inputMode="decimal"
                    value={details.minPayment}
                    onChange={(e) =>
                      setDetails((prev) => ({ ...prev, minPayment: e.target.value }))
                    }
                    placeholder="Ej. 500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <Skeleton className="h-[192px] w-full rounded-2xl" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setDetailsOpen(false)}
              disabled={detailsBusy}
            >
              Cerrar
            </Button>
            <Button type="button" onClick={handleSaveDetails} disabled={detailsBusy}>
              {detailsBusy ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

