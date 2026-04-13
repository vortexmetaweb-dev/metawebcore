"use client"

import { CheckIcon } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const plans = [
  {
    name: "Gratuito",
    price: "$0",
    description: "Control esencial para tus finanzas personales.",
    features: [
      "Registro de gastos e ingresos",
      "Dashboard básico",
      "Categorías estándar",
      "Soporte por comunidad",
    ],
    cta: "Comenzar gratis",
    highlight: false,
  },
  {
    name: "Privado",
    price: "$12",
    description: "Gestión inteligente con privacidad de grado bancario.",
    features: [
      "Todo lo de Gratuito",
      "Cifrado de datos avanzado",
      "Metas de ahorro inteligentes",
      "Soporte prioritario",
      "Sin anuncios",
    ],
    cta: "Prueba 14 días gratis",
    highlight: true,
  },
  {
    name: "Patrimonial",
    price: "$29",
    description: "Control total sobre activos y gestión de alto nivel.",
    features: [
      "Todo lo de Privado",
      "Múltiples cuentas y activos",
      "Reportes fiscales automáticos",
      "Asesoría personalizada",
      "Acceso anticipado a funciones",
    ],
    cta: "Contactar ventas",
    highlight: false,
  },
]

export default function Pricing() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }

  return (
    <section id="pricing" className="w-full bg-black py-20 text-white sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="text-center mb-16">
          <motion.h2 
            {...fadeInUp}
            className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          >
            Planes diseñados para tu privacidad.
          </motion.h2>
          <motion.p 
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
            className="mt-4 max-w-xl mx-auto text-pretty text-base text-white/70 sm:text-lg"
          >
            Escoge el nivel de control y seguridad que mejor se adapte a tu gestión patrimonial.
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex flex-col rounded-[28px] border p-8 transition-all duration-300 hover:scale-[1.02] ${
                plan.highlight 
                  ? "border-[#D4B483] bg-[#D4B483]/5 shadow-[0_0_40px_rgba(212,180,131,0.1)]" 
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#D4B483] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                  Más popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.price !== "Gratuito" && <span className="text-sm text-white/50">/mes</span>}
                </div>
                <p className="mt-4 text-sm text-white/60 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckIcon className={`size-5 shrink-0 ${plan.highlight ? "text-[#D4B483]" : "text-white/40"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.name === "Patrimonial" ? "#contacto" : "/auth"}
                className={`flex h-12 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-[#D4B483] text-black hover:bg-[#D4B483]/90 shadow-[0_10px_25px_rgba(212,180,131,0.25)]"
                    : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
