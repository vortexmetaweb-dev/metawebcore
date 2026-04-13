"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

import heroCoreImage from "../src/herocore.png"

export default function Hero() {
  const containerRef = useRef<HTMLElement | null>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const yParallax = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const opacityScroll = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const scaleScroll = useTransform(scrollYProgress, [0, 1], [1, 1.05])
  const yTextParallax = useTransform(scrollYProgress, [0, 1], [0, -50])

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <section
      ref={containerRef}
      id="productos"
      className="relative flex min-h-[90vh] w-full items-center overflow-hidden bg-black text-white"
    >
      <motion.div
        style={{ opacity: opacityScroll }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_20%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(780px_circle_at_80%_40%,rgba(255,255,255,0.035),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_35%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_50%_100%,rgba(212,180,131,0.08),transparent_55%),radial-gradient(900px_circle_at_0%_0%,rgba(255,255,255,0.03),transparent_50%),linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,0.75))]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <motion.div 
            className="lg:col-span-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ y: yTextParallax }}
          >
            <motion.div
              variants={fadeInUp}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4B483]/20 bg-[#D4B483]/10 px-3 py-1 text-xs font-medium text-[#D4B483]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4B483] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D4B483]"></span>
              </span>
              Gestión Financiera de Alta Privacidad
            </motion.div>
            <motion.h1 
              variants={fadeInUp}
              className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
            >
              Tus finanzas, con control y privacidad total.
            </motion.h1>
            <motion.p 
              variants={fadeInUp}
              className="mt-4 max-w-xl text-pretty text-base text-white/70 sm:text-lg"
            >
              Gestión inteligente de patrimonio con seguridad de grado bancario.
              Potencia SaaS con privacidad absoluta.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="mt-7 flex flex-wrap gap-3"
            >
              <Link
                href="/auth"
                className="group inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-all hover:bg-white/90 hover:scale-105 active:scale-95"
              >
                Crear cuenta
                <ArrowRightIcon className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
              >
                Ver dashboard
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="lg:col-span-6"
            style={{ y: yParallax, scale: scaleScroll }}
            initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
          >
            <div className="relative mx-auto w-full max-w-xl">
              <Image
                alt="Vista de MetaWeb Core"
                className="h-auto w-full object-cover opacity-95 [mask-image:radial-gradient(closest-side,black_68%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,black_68%,transparent_100%)]"
                priority
                src={heroCoreImage}
              />
            </div>
          </motion.div>
        </div>
      </div>

    </section>
  )
}
