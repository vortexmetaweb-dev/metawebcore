"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-120px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      className="w-full bg-black text-white"
    >
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 pt-16">
        <div className="grid gap-10 border-t border-white/10 pt-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[#D4B483]" />
              <span>
                MetaWeb <span className="text-[#D4B483]">Core</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Control y claridad para tus finanzas, con una experiencia oscura y
              enfocada.
            </p>
          </div>

          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Producto
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <Link className="text-white/70 hover:text-white" href="#productos">
                    Inicio
                  </Link>
                  <Link
                    className="text-white/70 hover:text-white"
                    href="#funcionalidades"
                  >
                    Funcionalidades
                  </Link>
                  <Link className="text-white/70 hover:text-white" href="#pricing">
                    Precios
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Recursos
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <Link
                    className="text-white/70 hover:text-white"
                    href="#documentacion"
                  >
                    Documentación
                  </Link>
                  <Link className="text-white/70 hover:text-white" href="#faq">
                    FAQ
                  </Link>
                  <Link className="text-white/70 hover:text-white" href="#support">
                    Soporte
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Cuenta
                </p>
                <div className="mt-4 grid gap-2 text-sm">
                  <Link className="text-white/70 hover:text-white" href="/auth">
                    Crear cuenta
                  </Link>
                  <Link className="text-white/70 hover:text-white" href="/dashboard">
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MetaWeb Core. Todos los derechos reservados.</p>
          <p className="text-white/40">
            Hecho por MetaWeb Dev Solutions.
          </p>
        </div>
      </div>
    </motion.footer>
  )
}

