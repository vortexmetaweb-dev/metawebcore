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

type FixedExpense = {
  id: string
  name: string
  amount: number
  dueDay: number
  category: string
  active: boolean
  createdAt: number
}

const STORAGE_KEY = "mwcore.fixed-expenses.v1"

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

function loadFixedExpenses(): FixedExpense[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null))
      .map((row) => {
        if (!row) return null
        const id = typeof row.id === "string" ? row.id : ""
        const name = typeof row.name === "string" ? row.name : ""
        const amount = Number(row.amount)
        const dueDay = Number(row.dueDay)
        const category = typeof row.category === "string" ? row.category : "Otros"
        const active = Boolean(row.active)
        const createdAt = Number(row.createdAt)
        if (!id || !name) return null
        if (!Number.isFinite(amount) || amount <= 0) return null
        if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) return null
        if (!Number.isFinite(createdAt)) return null
        return { id, name, amount, dueDay, category, active, createdAt }
      })
      .filter(Boolean) as FixedExpense[]
  } catch {
    return []
  }
}

function saveFixedExpenses(items: FixedExpense[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function GastosFijosPage() {
  const [items, setItems] = React.useState<FixedExpense[]>([])
  const [addOpen, setAddOpen] = React.useState(false)

  const [draftName, setDraftName] = React.useState("")
  const [draftAmount, setDraftAmount] = React.useState("")
  const [draftDueDay, setDraftDueDay] = React.useState("1")
  const [draftCategory, setDraftCategory] = React.useState("Servicios")

  React.useEffect(() => {
    setItems(loadFixedExpenses())
  }, [])

  React.useEffect(() => {
    saveFixedExpenses(items)
  }, [items])

  const summary = React.useMemo(() => {
    const active = items.filter((i) => i.active)
    const totalMonthly = active.reduce((acc, i) => acc + i.amount, 0)
    return { activeCount: active.length, totalMonthly }
  }, [items])

  const createItem = () => {
    const name = draftName.trim()
    const amount = parseNumber(draftAmount)
    const dueDay = Math.floor(parseNumber(draftDueDay))
    const category = draftCategory.trim() || "Otros"
    if (!name || amount <= 0) return false
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) return false

    const next: FixedExpense = {
      id: nanoid(),
      name,
      amount,
      dueDay,
      category,
      active: true,
      createdAt: Date.now(),
    }

    setItems((prev) => [next, ...prev])
    setDraftName("")
    setDraftAmount("")
    setDraftDueDay("1")
    setDraftCategory("Servicios")
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
                <BreadcrumbPage>Gastos Fijos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">Gastos Fijos</div>
            <div className="text-sm text-muted-foreground">
              Registra tus pagos recurrentes para que tu presupuesto se calcule mejor.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Resumen</div>
                <div className="text-sm text-muted-foreground">
                  {summary.activeCount} activos · Total mensual:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatMoney(summary.totalMonthly)}
                  </span>
                </div>
              </div>
              <Button type="button" size="lg" className="rounded-full" onClick={() => setAddOpen(true)}>
                Agregar gasto fijo
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Historial</div>
              <div className="text-xs text-muted-foreground">
                {items.length > 0 ? `${items.length} registros` : "Sin registros"}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Agrega tus gastos fijos (renta, luz, internet, etc.).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[680px] overflow-hidden rounded-2xl border border-input bg-background/70 shadow-sm ring-1 ring-border">
                  <div className="grid grid-cols-12 gap-2 border-b border-border bg-background/40 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <div className="col-span-5">Concepto</div>
                    <div className="col-span-2 text-right">Monto</div>
                    <div className="col-span-2 text-center">Día</div>
                    <div className="col-span-2">Categoría</div>
                    <div className="col-span-1 text-right">Acción</div>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className={cn(
                          "grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30",
                          it.active ? null : "opacity-60"
                        )}
                      >
                        <div className="col-span-5">
                          <div className="truncate font-medium">{it.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {it.active ? "Activo" : "Inactivo"}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-semibold tabular-nums">
                          {formatMoney(it.amount)}
                        </div>
                        <div className="col-span-2 text-center text-muted-foreground tabular-nums">
                          {it.dueDay}
                        </div>
                        <div className="col-span-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {it.category}
                          </span>
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === it.id ? { ...x, active: !x.active } : x
                                )
                              )
                            }
                          >
                            {it.active ? "✓" : "○"}
                          </Button>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Agregar gasto fijo</DialogTitle>
            <DialogDescription>
              Agrega un pago recurrente para tener un presupuesto más preciso.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const ok = createItem()
              if (ok) setAddOpen(false)
            }}
          >
            <div className="grid gap-1">
              <div className="text-sm font-medium">Concepto</div>
              <Input
                className="h-10 rounded-xl"
                placeholder="Ej. Renta, internet, luz…"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <div className="text-sm font-medium">Monto mensual (MXN)</div>
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                placeholder="0.00"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Día de pago</div>
                <Input
                  className="h-10 rounded-xl"
                  inputMode="numeric"
                  placeholder="1"
                  value={draftDueDay}
                  onChange={(e) => setDraftDueDay(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Categoría</div>
                <Input
                  className="h-10 rounded-xl"
                  placeholder="Servicios"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full"
                disabled={!draftName.trim() || parseNumber(draftAmount) <= 0}
              >
                Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

