"use client"

import { motion } from "framer-motion"
import { UserPlus, ShieldCheck, BarChart3, Rocket } from "lucide-react"

const steps = [
  {
    id: "01",
    name: "Registro Privado",
    description: "Crea tu cuenta en segundos con cifrado de extremo a extremo.",
    icon: UserPlus,
  },
  {
    id: "02",
    name: "Conexión Segura",
    description: "Vincula tus activos y cuentas con seguridad de grado bancario.",
    icon: ShieldCheck,
  },
  {
    id: "03",
    name: "Análisis Inteligente",
    description: "Nuestra IA organiza y categoriza tus flujos automáticamente.",
    icon: BarChart3,
  },
  {
    id: "04",
    name: "Optimización Total",
    description: "Recibe insights accionables para potenciar tu patrimonio.",
    icon: Rocket,
  },
]

export default function Procesos() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false },
    transition: { duration: 0.6, ease: "easeOut" }
  }

  return (
    <section id="procesos" className="relative w-full overflow-hidden bg-black py-20 text-white sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_0%,rgba(212,180,131,0.10),transparent_60%),radial-gradient(700px_circle_at_10%_85%,rgba(255,255,255,0.03),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_45%)]"
      />
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="text-center mb-20">
          <motion.h2 
            {...fadeInUp}
            className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          >
            Tu camino hacia la libertad financiera.
          </motion.h2>
          <motion.p 
            {...fadeInUp}
            transition={{ ...fadeInUp.transition, delay: 0.1 }}
            className="mt-4 max-w-xl mx-auto text-pretty text-base text-white/70 sm:text-lg"
          >
            Un proceso simplificado diseñado para mantener tu privacidad mientras potencias tu patrimonio.
          </motion.p>
        </div>

        <div className="relative grid gap-12 md:grid-cols-4">
          {/* Línea conectora decorativa en desktop */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4B483]/20 to-transparent" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative group text-center"
            >
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 transition-all duration-500 group-hover:border-[#D4B483]/50 group-hover:bg-[#D4B483]/10 group-hover:shadow-[0_0_30px_rgba(212,180,131,0.15)]">
                <step.icon className="h-10 w-10 text-white/40 transition-colors duration-500 group-hover:text-[#D4B483]" />
                
                {/* Número del paso */}
                <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black text-[10px] font-black tracking-tighter text-[#D4B483]">
                  {step.id}
                </span>
              </div>
              
              <h3 className="text-lg font-bold tracking-tight mb-3 group-hover:text-[#D4B483] transition-colors duration-300">
                {step.name}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed px-4">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
