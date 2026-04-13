"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/SaaS/dashboard/components/ui/dropdown-menu"

export default function Navbar() {
  const [featuresOpen, setFeaturesOpen] = React.useState(false)
  const [resourcesOpen, setResourcesOpen] = React.useState(false)
  const featuresCloseTimer = React.useRef<number | null>(null)
  const resourcesCloseTimer = React.useRef<number | null>(null)

  function clearTimer(ref: React.MutableRefObject<number | null>) {
    if (ref.current === null) return
    window.clearTimeout(ref.current)
    ref.current = null
  }

  function scheduleClose(
    ref: React.MutableRefObject<number | null>,
    setOpen: (next: boolean) => void
  ) {
    clearTimer(ref)
    ref.current = window.setTimeout(() => setOpen(false), 120)
  }

  const navVariants = {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
  }

  return (
    <motion.header 
      initial="initial"
      animate="animate"
      variants={navVariants}
      className="w-full border-b border-white/10 bg-black text-white"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold tracking-tight transition-colors hover:bg-white/10"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#D4B483]" />
          <span>MetaWeb Core</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="primary">
          <Link href="#productos" className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Productos
          </Link>
          <div
            onMouseEnter={() => {
              clearTimer(featuresCloseTimer)
              setFeaturesOpen(true)
            }}
            onMouseLeave={() => scheduleClose(featuresCloseTimer, setFeaturesOpen)}
          >
            <DropdownMenu open={featuresOpen} onOpenChange={setFeaturesOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-[#D4B483]/15 data-[state=open]:text-white"
                >
                  Funcionalidades
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="w-56 rounded-2xl border border-white/10 bg-black p-1 text-white shadow-[0_18px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                onMouseEnter={() => clearTimer(featuresCloseTimer)}
                onMouseLeave={() =>
                  scheduleClose(featuresCloseTimer, setFeaturesOpen)
                }
              >
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#funcionalidades">Gastos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#funcionalidades">Ingresos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#funcionalidades">Cuentas</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#funcionalidades">Metas</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link href="#documentacion" className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Documentación
          </Link>
          <div
            onMouseEnter={() => {
              clearTimer(resourcesCloseTimer)
              setResourcesOpen(true)
            }}
            onMouseLeave={() => scheduleClose(resourcesCloseTimer, setResourcesOpen)}
          >
            <DropdownMenu open={resourcesOpen} onOpenChange={setResourcesOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-[#D4B483]/15 data-[state=open]:text-white"
                >
                  Recursos
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="w-56 rounded-2xl border border-white/10 bg-black p-1 text-white shadow-[0_18px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                onMouseEnter={() => clearTimer(resourcesCloseTimer)}
                onMouseLeave={() =>
                  scheduleClose(resourcesCloseTimer, setResourcesOpen)
                }
              >
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#recursos">Centro de ayuda</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#recursos">Guías</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#recursos">Plantillas</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl hover:bg-[#D4B483]/15 focus:bg-[#D4B483]/15"
                >
                  <Link href="#recursos">Actualizaciones</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link href="#pricing" className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Precio
          </Link>
          <Link href="#support" className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            Soporte
          </Link>
        </nav>
        <motion.nav 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2" 
          aria-label="actions"
        >
          <Link
            href="/auth"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#D4B483] px-5 text-sm font-semibold text-[#0D0D0D] shadow-[0_6px_14px_rgba(0,0,0,0.35)] transition-all hover:brightness-105"
          >
            Login
          </Link>
        </motion.nav>
      </div>
    </motion.header>
  )
}
