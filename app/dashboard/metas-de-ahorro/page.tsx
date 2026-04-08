"use client"

import * as React from "react"
import { nanoid } from "nanoid"

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/SaaS/dashboard/components/ui/dialog"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"
import { cn } from "@/lib/utils"

type BudgetItemKind = "fijo" | "variable" | "hormiga" | "deuda" | "ahorro"

type BudgetItem = {
  id: string
  kind: BudgetItemKind
  name: string
  amount: string
}

type BudgetDraft = {
  month: string
  income: string
  items: BudgetItem[]
}

type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetMonth: string
  createdAt: number
}

const GOALS_KEY = "mwcore.savings.goals.v1"

function parseNumber(raw: string) {
  const n = Number(String(raw).replaceAll(",", "").trim())
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return String(n)
  }
}

function getCurrentMonthValue() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function getBudgetKey(month: string) {
  return `mwcore.budget.active.${month}`
}

function loadBudget(month: string): BudgetDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(getBudgetKey(month))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BudgetDraft>
    if (!parsed || typeof parsed !== "object") return null
    const items = Array.isArray(parsed.items) ? parsed.items : []
    return {
      month: typeof parsed.month === "string" ? parsed.month : month,
      income: typeof parsed.income === "string" ? parsed.income : "",
      items: items
        .map((it) => {
          const record =
            it && typeof it === "object" ? (it as Record<string, unknown>) : null
          const kind = record?.kind
          const name = record?.name
          const amount = record?.amount
          if (
            kind !== "fijo" &&
            kind !== "variable" &&
            kind !== "hormiga" &&
            kind !== "deuda" &&
            kind !== "ahorro"
          ) {
            return null
          }
          if (typeof name !== "string") return null
          return {
            id: typeof record?.id === "string" ? (record.id as string) : nanoid(),
            kind,
            name,
            amount: typeof amount === "string" ? amount : "",
          } satisfies BudgetItem
        })
        .filter(Boolean) as BudgetItem[],
    }
  } catch {
    return null
  }
}

function monthsDiff(fromMonth: string, toMonth: string) {
  const [fy, fm] = fromMonth.split("-").map((v) => Number(v))
  const [ty, tm] = toMonth.split("-").map((v) => Number(v))
  if (!Number.isFinite(fy) || !Number.isFinite(fm) || !Number.isFinite(ty) || !Number.isFinite(tm)) {
    return 0
  }
  return (ty - fy) * 12 + (tm - fm)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function loadGoals(): SavingsGoal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(GOALS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null))
      .map((row) => {
        if (!row) return null
        const id = typeof row.id === "string" ? row.id : ""
        const name = typeof row.name === "string" ? row.name : ""
        const targetAmount = Number(row.targetAmount)
        const currentAmount = Number(row.currentAmount)
        const targetMonth = typeof row.targetMonth === "string" ? row.targetMonth : ""
        const createdAt = Number(row.createdAt)
        if (!id || !name || !targetMonth) return null
        if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null
        if (!Number.isFinite(currentAmount) || currentAmount < 0) return null
        if (!Number.isFinite(createdAt)) return null
        return { id, name, targetAmount, currentAmount, targetMonth, createdAt }
      })
      .filter(Boolean) as SavingsGoal[]
  } catch {
    return []
  }
}

function saveGoals(goals: SavingsGoal[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

export default function MetasDeAhorroPage() {
  const [month, setMonth] = React.useState<string>(() => getCurrentMonthValue())
  const [goals, setGoals] = React.useState<SavingsGoal[]>(() => [])
  const [addOpen, setAddOpen] = React.useState<boolean>(false)

  const [draftName, setDraftName] = React.useState<string>("")
  const [draftTargetAmount, setDraftTargetAmount] = React.useState<string>("")
  const [draftCurrentAmount, setDraftCurrentAmount] = React.useState<string>("0")
  const [draftTargetMonth, setDraftTargetMonth] = React.useState<string>(() => getCurrentMonthValue())

  React.useEffect(() => {
    setGoals(loadGoals())
  }, [])

  React.useEffect(() => {
    saveGoals(goals)
  }, [goals])

  const budget = React.useMemo(() => loadBudget(month), [month])

  const budgetSummary = React.useMemo(() => {
    const income = parseNumber(budget?.income ?? "")
    const fixed = (budget?.items ?? [])
      .filter((it) => it.kind === "fijo")
      .reduce((acc, it) => acc + parseNumber(it.amount), 0)
    const variable = (budget?.items ?? [])
      .filter((it) => it.kind === "variable" || it.kind === "hormiga")
      .reduce((acc, it) => acc + parseNumber(it.amount), 0)
    const debt = (budget?.items ?? [])
      .filter((it) => it.kind === "deuda")
      .reduce((acc, it) => acc + parseNumber(it.amount), 0)
    const savings = (budget?.items ?? [])
      .filter((it) => it.kind === "ahorro")
      .reduce((acc, it) => acc + parseNumber(it.amount), 0)
    const outflow = fixed + variable + debt + savings
    const available = income - outflow
    return { income, fixed, variable, debt, savings, outflow, available }
  }, [budget])

  const createGoal = () => {
    const name = draftName.trim()
    const targetAmount = parseNumber(draftTargetAmount)
    const currentAmount = parseNumber(draftCurrentAmount)
    const targetMonth = draftTargetMonth
    if (!name || targetAmount <= 0 || currentAmount < 0 || !targetMonth) return false
    const next: SavingsGoal = {
      id: nanoid(),
      name,
      targetAmount,
      currentAmount,
      targetMonth,
      createdAt: Date.now(),
    }
    setGoals((prev) => [next, ...prev])
    setDraftName("")
    setDraftTargetAmount("")
    setDraftCurrentAmount("0")
    setDraftTargetMonth(month)
    return true
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
                <BreadcrumbPage>Metas de Ahorro</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">Metas de Ahorro</div>
            <div className="text-sm text-muted-foreground">
              Crea metas basadas en tu presupuesto y registra un plan mensual.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Mes</div>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <Button type="button" size="lg" className="rounded-full" onClick={() => setAddOpen(true)}>
                Crear meta
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Ingreso neto</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(budgetSummary.income)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Gastos fijos</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(budgetSummary.fixed)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Ahorro (presupuesto)</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(budgetSummary.savings)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Disponible</div>
                <div
                  className={cn(
                    "mt-1 text-lg font-semibold tabular-nums",
                    budgetSummary.available < 0 ? "text-destructive" : null
                  )}
                >
                  {formatMoney(budgetSummary.available)}
                </div>
              </div>
            </div>

            {!budget ? (
              <div className="mt-4 text-sm text-muted-foreground">
                No hay un Presupuesto Activo guardado para este mes. Crea uno en Presupuestos Activos para mejorar las recomendaciones.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Historial</div>
              <div className="text-xs text-muted-foreground">
                {goals.length > 0 ? `${goals.length} metas` : "Sin metas"}
              </div>
            </div>

            {goals.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Crea una meta para ver tu plan de ahorro.
              </div>
            ) : (
              <div className="grid gap-2">
                {goals.map((g) => {
                  const remaining = Math.max(0, g.targetAmount - g.currentAmount)
                  const diff = monthsDiff(month, g.targetMonth)
                  const months = Math.max(1, diff + 1)
                  const requiredMonthly = remaining / months
                  const suggestedMonthly = Math.max(0, Math.min(requiredMonthly, Math.max(0, budgetSummary.available)))
                  const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
                  const pct = clamp(progress, 0, 100)
                  const shortfall = Math.max(0, requiredMonthly - Math.max(0, budgetSummary.available))

                  return (
                    <div
                      key={g.id}
                      className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{g.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Meta: {formatMoney(g.targetAmount)} · Objetivo: {g.targetMonth}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setGoals((prev) => prev.filter((x) => x.id !== g.id))}
                        >
                          ×
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Ahorrado</div>
                          <div className="mt-1 text-base font-semibold tabular-nums">
                            {formatMoney(g.currentAmount)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Falta</div>
                          <div className="mt-1 text-base font-semibold tabular-nums">
                            {formatMoney(remaining)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">
                            Ahorro mensual sugerido
                          </div>
                          <div className="mt-1 text-base font-semibold tabular-nums">
                            {formatMoney(suggestedMonthly)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div>Progreso</div>
                          <div className="tabular-nums">{Math.round(pct)}%</div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-muted-foreground">
                        Para llegar a tiempo necesitas aprox.{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatMoney(requiredMonthly)}
                        </span>{" "}
                        / mes durante{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                          {months}
                        </span>{" "}
                        mes(es).
                      </div>

                      {shortfall > 0 ? (
                        <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          Tu disponible del mes no alcanza por{" "}
                          <span className="font-semibold tabular-nums text-destructive">
                            {formatMoney(shortfall)}
                          </span>
                          . Ajusta tu presupuesto (reduce gastos fijos/variables o aumenta ingresos).
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear meta de ahorro</DialogTitle>
            <DialogDescription>
              Dinos qué quieres lograr y te sugerimos un ahorro mensual según tu presupuesto.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const ok = createGoal()
              if (ok) setAddOpen(false)
            }}
          >
            <div className="grid gap-1">
              <div className="text-sm font-medium">Nombre</div>
              <Input
                className="h-10 rounded-xl"
                placeholder="Ej. Viaje, fondo de emergencia, laptop…"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-sm font-medium">Monto meta (MXN)</div>
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                placeholder="0.00"
                value={draftTargetAmount}
                onChange={(e) => setDraftTargetAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-sm font-medium">Ya ahorrado (MXN)</div>
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                placeholder="0.00"
                value={draftCurrentAmount}
                onChange={(e) => setDraftCurrentAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-sm font-medium">Mes objetivo</div>
              <Input
                type="month"
                className="h-10 rounded-xl"
                value={draftTargetMonth}
                onChange={(e) => setDraftTargetMonth(e.target.value)}
              />
            </div>

            <DialogFooter className="rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full"
                disabled={!draftName.trim() || parseNumber(draftTargetAmount) <= 0}
              >
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

