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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/SaaS/dashboard/components/ui/select"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"

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

function getCurrentMonthValue() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function getStorageKey(month: string) {
  return `mwcore.budget.active.${month}`
}

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

function isBudgetItemKind(value: unknown): value is BudgetItemKind {
  return (
    value === "fijo" ||
    value === "variable" ||
    value === "hormiga" ||
    value === "deuda" ||
    value === "ahorro"
  )
}

function loadDraft(month: string): BudgetDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(getStorageKey(month))
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

          const idRaw = record?.id
          const kindRaw = record?.kind
          const nameRaw = record?.name
          const amountRaw = record?.amount

          const kind = isBudgetItemKind(kindRaw) ? kindRaw : null
          const name = typeof nameRaw === "string" ? nameRaw : ""
          const amount = typeof amountRaw === "string" ? amountRaw : ""

          if (!kind || !name) return null

          return {
            id: typeof idRaw === "string" ? idRaw : nanoid(),
            kind,
            name,
            amount,
          }
        })
        .filter(Boolean) as BudgetItem[],
    }
  } catch {
    return null
  }
}

function saveDraft(draft: BudgetDraft) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(getStorageKey(draft.month), JSON.stringify(draft))
}

export default function PresupuestosActivosPage() {
  const [month, setMonth] = React.useState<string>(() => getCurrentMonthValue())
  const [income, setIncome] = React.useState<string>("")
  const [items, setItems] = React.useState<BudgetItem[]>([])
  const [newKind, setNewKind] = React.useState<BudgetItemKind>("fijo")
  const [newName, setNewName] = React.useState<string>("")
  const [newAmount, setNewAmount] = React.useState<string>("")
  const [savedAt, setSavedAt] = React.useState<number | null>(null)
  const [addOpen, setAddOpen] = React.useState<boolean>(false)

  React.useEffect(() => {
    const loaded = loadDraft(month)
    if (!loaded) {
      setIncome("")
      setItems([])
      return
    }
    setIncome(loaded.income)
    setItems(loaded.items)
  }, [month])

  const totals = React.useMemo(() => {
    const incomeN = parseNumber(income)
    const byKind: Record<BudgetItemKind, number> = {
      fijo: 0,
      variable: 0,
      hormiga: 0,
      deuda: 0,
      ahorro: 0,
    }
    for (const it of items) {
      byKind[it.kind] += parseNumber(it.amount)
    }
    const outflow =
      byKind.fijo + byKind.variable + byKind.hormiga + byKind.deuda + byKind.ahorro
    const remaining = incomeN - outflow
    return { incomeN, byKind, outflow, remaining }
  }, [income, items])

  const handleSave = () => {
    saveDraft({ month, income, items })
    setSavedAt(Date.now())
  }

  const handleAdd = () => {
    const name = newName.trim()
    const amount = newAmount.trim()
    if (!name || !amount) return false
    setItems((prev) => [
      ...prev,
      { id: nanoid(), kind: newKind, name, amount },
    ])
    setNewName("")
    setNewAmount("")
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
                <BreadcrumbPage>Presupuestos Activos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">Presupuestos Activos</div>
            <div className="text-sm text-muted-foreground">
              Crea tu plan mensual y controla tu flujo de efectivo.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Mes</div>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Ingreso neto (MXN)</div>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" className="rounded-full" onClick={handleSave}>
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setIncome("")
                    setItems([])
                    setNewName("")
                    setNewAmount("")
                    saveDraft({ month, income: "", items: [] })
                    setSavedAt(Date.now())
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Ingreso neto</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(totals.incomeN)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Gasto total + deuda + ahorro</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoney(totals.outflow)}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Disponible</div>
                <div
                  className={
                    totals.remaining < 0
                      ? "mt-1 text-lg font-semibold text-destructive tabular-nums"
                      : "mt-1 text-lg font-semibold tabular-nums"
                  }
                >
                  {formatMoney(totals.remaining)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {savedAt
                ? `Guardado: ${new Date(savedAt).toLocaleString("es-MX")}`
                : "Aún no has guardado"}
            </div>
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={() => setAddOpen(true)}
            >
              Agregar partida
            </Button>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Agregar partida</DialogTitle>
                <DialogDescription>
                  Registra un gasto, deuda o ahorro dentro de tu presupuesto.
                </DialogDescription>
              </DialogHeader>

              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const ok = handleAdd()
                  if (ok) setAddOpen(false)
                }}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1 md:col-span-1">
                    <div className="text-sm font-medium">Tipo</div>
                    <Select
                      value={newKind}
                      onValueChange={(value) =>
                        setNewKind(value as BudgetItemKind)
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="fijo">Gasto fijo</SelectItem>
                          <SelectItem value="variable">Gasto variable</SelectItem>
                          <SelectItem value="hormiga">Gasto hormiga</SelectItem>
                          <SelectItem value="deuda">Deuda</SelectItem>
                          <SelectItem value="ahorro">Ahorro</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1 md:col-span-2">
                    <div className="text-sm font-medium">Concepto</div>
                    <Input
                      className="h-10 rounded-xl"
                      placeholder="Ej. Renta, comida, transporte…"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-1">
                  <div className="text-sm font-medium">Monto (MXN)</div>
                  <Input
                    className="h-10 rounded-xl"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>

                <DialogFooter className="rounded-b-2xl">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={!newName.trim() || !newAmount.trim()}
                  >
                    Agregar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Historial</div>
              <div className="text-xs text-muted-foreground">
                {items.length > 0 ? `${items.length} partidas` : "Sin partidas"}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Agrega tus gastos, deuda y ahorro para armar tu presupuesto del mes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[680px] overflow-hidden rounded-2xl border border-input bg-background/70 shadow-sm ring-1 ring-border">
                  <div className="grid grid-cols-12 gap-2 border-b border-border bg-background/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <div className="col-span-3">Tipo</div>
                    <div className="col-span-5">Concepto</div>
                    <div className="col-span-3 text-right">Monto</div>
                    <div className="col-span-1 text-right">Acción</div>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="col-span-3">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {it.kind === "fijo"
                              ? "Gasto fijo"
                              : it.kind === "variable"
                                ? "Gasto variable"
                                : it.kind === "hormiga"
                                  ? "Gasto hormiga"
                                  : it.kind === "deuda"
                                    ? "Deuda"
                                    : "Ahorro"}
                          </span>
                        </div>
                        <div className="col-span-5">{it.name}</div>
                        <div className="col-span-3 text-right font-semibold tabular-nums">
                          {formatMoney(parseNumber(it.amount))}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setItems((prev) => prev.filter((x) => x.id !== it.id))
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-2 border-t border-border bg-background/40 px-4 py-3 text-sm">
                    <div className="col-span-8 font-medium text-muted-foreground">
                      Total
                    </div>
                    <div className="col-span-3 text-right font-semibold tabular-nums">
                      {formatMoney(totals.outflow)}
                    </div>
                    <div className="col-span-1" />
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
