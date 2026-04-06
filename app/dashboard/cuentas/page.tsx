"use client"

import { createClient, type Session } from "@supabase/supabase-js"
import * as React from "react"
import { Trash2Icon } from "lucide-react"

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
import { Input } from "@/SaaS/dashboard/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/SaaS/dashboard/components/ui/select"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { Skeleton } from "@/SaaS/dashboard/components/ui/skeleton"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"

type CardKind = "credit" | "debit"

type CardNetwork = "mastercard" | "visa" | "amex" | "unknown"

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
  network: CardNetwork
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

function detectNetwork(digits: string): CardNetwork {
  if (!digits) return "unknown"
  if (/^4\d{0,}$/.test(digits)) return "visa"
  if (/^(5[1-5]|2[2-7])\d{0,}$/.test(digits)) return "mastercard"
  if (/^3[47]\d{0,}$/.test(digits)) return "amex"
  return "unknown"
}

function formatNetworkLabel(network: CardNetwork) {
  if (network === "visa") return "VISA"
  if (network === "amex") return "AMEX"
  if (network === "mastercard") return "MASTERCARD"
  return "DESCONOCIDA"
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

function normalizeBankKey(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function getBankProfile(company: string) {
  const key = normalizeBankKey(company)
  const isBbva = key.includes("BBVA")
  const isSantander = key.includes("SANTANDER")
  const isBanorte = key.includes("BANORTE")
  const isHsbc = key.includes("HSBC")
  const isCitibanamex = key.includes("CITI") || key.includes("BANAMEX")
  const isNu = key === "NU" || key.includes("NUBANK") || key.includes("NU BANK")

  if (isBbva) {
    return {
      id: "bbva",
      label: "BBVA",
      themeCredit: "brand-dark" as const,
      themeDebit: "gray-light" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          BBVA
        </span>
      ),
    }
  }
  if (isSantander) {
    return {
      id: "santander",
      label: "Santander",
      themeCredit: "salmon-strip" as const,
      themeDebit: "brand-light" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          SANTANDER
        </span>
      ),
    }
  }
  if (isBanorte) {
    return {
      id: "banorte",
      label: "Banorte",
      themeCredit: "gray-dark" as const,
      themeDebit: "transparent-strip" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-rose-700 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          BANORTE
        </span>
      ),
    }
  }
  if (isHsbc) {
    return {
      id: "hsbc",
      label: "HSBC",
      themeCredit: "gradient-strip-vertical" as const,
      themeDebit: "gray-strip-vertical" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-red-700 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          HSBC
        </span>
      ),
    }
  }
  if (isCitibanamex) {
    return {
      id: "citibanamex",
      label: "Citibanamex",
      themeCredit: "transparent-gradient" as const,
      themeDebit: "gray-light" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-sky-700 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          CITI
        </span>
      ),
    }
  }
  if (isNu) {
    return {
      id: "nu",
      label: "Nu",
      themeCredit: "gradient-strip" as const,
      themeDebit: "transparent" as const,
      logo: (
        <span className="inline-flex items-center rounded-md bg-fuchsia-700 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
          NU
        </span>
      ),
    }
  }

  const fallbackLabel = company.trim() ? company.trim() : "Banco"
  const short = normalizeBankKey(fallbackLabel).replace(/[^A-Z0-9]/g, "").slice(0, 5)
  return {
    id: "other",
    label: fallbackLabel,
    themeCredit: null,
    themeDebit: null,
    logo: (
      <span className="inline-flex items-center rounded-md bg-black/20 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
        {short || "BANCO"}
      </span>
    ),
  }
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
  const [cardsLoading, setCardsLoading] = React.useState(false)
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
      setCardsLoading(true)
      try {
        const full = await supabase
          .from(CARDS_TABLE)
          .select(
            "id, kind, network, company, holder, last4, exp_month, exp_year, created_at"
          )
          .eq("tenant_id", tenantId)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50)

        if (cancelled) return

        let data: unknown[] | null = full.data as unknown[] | null
        let error = full.error

        if (error && isMissingSchemaError(error.message)) {
          const fallback = await supabase
            .from(CARDS_TABLE)
            .select("id, kind, company, holder, last4, exp_month, exp_year, created_at")
            .eq("tenant_id", tenantId)
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50)
          data = fallback.data as unknown[] | null
          error = fallback.error
        }

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
            network:
              (String((row as { network?: unknown }).network ?? "unknown") as CardNetwork) ||
              "unknown",
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
    const network = detectNetwork(digits)
    const bank = getBankProfile(company)
    const seed = `${draft.kind}|${company}|${holder}|${digits}|${draft.exp}`

    return {
      company,
      holder,
      exp,
      cardNumber: last4 ? formatMaskedCardNumber(last4) : "•••• •••• •••• ••••",
      bankLogo: bank.logo,
      network,
      backgroundClassName: getCardBackground(seed),
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
    const network = detectNetwork(digits)
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
          network,
          company: draft.company.trim() || "Banco",
          holder: holder.toUpperCase(),
          last4,
          exp_month: expParts.expMonth,
          exp_year: expParts.expYear,
          tenant_id: tenantId,
          user_id: session.user.id,
        }

        let { data, error } = await supabase
          .from(CARDS_TABLE)
          .insert(payload)
          .select("id, kind, network, company, holder, last4, exp_month, exp_year, created_at")
          .single()

        if (error && isMissingSchemaError(error.message)) {
          ;({ data, error } = await supabase
            .from(CARDS_TABLE)
            .insert({
              kind: payload.kind,
              company: payload.company,
              holder: payload.holder,
              last4: payload.last4,
              exp_month: payload.exp_month,
              exp_year: payload.exp_year,
              tenant_id: payload.tenant_id,
              user_id: payload.user_id,
            })
            .select("id, kind, company, holder, last4, exp_month, exp_year, created_at")
            .single())
        }

        if (error || !data) {
          if (!isMissingSchemaError(error?.message ?? "")) {
            setError(error?.message ?? "Respuesta vacía de Supabase.")
          }
          setNotice("No se pudo guardar en Supabase. Guardado localmente.")

          const item: SavedCard = {
            id: crypto.randomUUID(),
            kind: draft.kind,
            network,
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
            network: (String((data as { network?: unknown }).network ?? network) as CardNetwork) || network,
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
          network,
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

  async function handleDeleteCard(cardId: string) {
    if (typeof window !== "undefined") {
      const ok = window.confirm("¿Eliminar esta tarjeta?")
      if (!ok) return
    }

    setNotice(null)
    setError(null)

    const uid = session?.user.id
    const tid = tenantId ?? "personal"
    const key = getCardsStorageKey(uid, tid)

    setBusy(true)
    try {
      if (supabase && session && tenantId && tenantId !== "null") {
        const { error } = await supabase
          .from(CARDS_TABLE)
          .delete()
          .eq("id", cardId)
          .eq("tenant_id", tenantId)
          .eq("user_id", session.user.id)

        if (error && !isMissingSchemaError(error.message)) {
          setError(error.message)
          return
        }
      }

      setCards((prev) => {
        const next = prev.filter((c) => c.id !== cardId)
        saveLocalCards(key, next)
        return next
      })

      setNotice("Tarjeta eliminada.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setBusy(false)
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
                  type="brand-dark"
                  bankLogo={preview.bankLogo}
                  network={preview.network}
                  backgroundClassName={preview.backgroundClassName}
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
                  <div className="text-xs text-muted-foreground">
                    Red: {formatNetworkLabel(preview.network)}
                  </div>
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
                  Aún no has agregado tarjetas.
                </div>
              )
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                  <div key={c.id} className="relative rounded-xl bg-muted/30 p-3">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleDeleteCard(c.id)}
                      disabled={busy}
                    >
                      <Trash2Icon />
                    </Button>
                    <CreditCard
                      width={320}
                      company={c.company}
                      cardHolder={c.holder}
                      cardExpiration={c.exp}
                      cardNumber={formatMaskedCardNumber(c.last4)}
                      type="brand-dark"
                      bankLogo={getBankProfile(c.company).logo}
                      network={c.network}
                      backgroundClassName={getCardBackground(`${c.id}|${c.last4}`)}
                      className="mx-auto"
                    />
                  </div>
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
      </div>
    </>
  )
}
