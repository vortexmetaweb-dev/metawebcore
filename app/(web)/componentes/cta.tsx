"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { motion } from "framer-motion"

export default function CTA() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  }

  return (
    <section className="relative w-full overflow-hidden bg-black py-20 text-white sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(700px_180px_at_50%_0%,rgba(212,180,131,0.55),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_90%,rgba(212,180,131,0.10),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_45%)]"
      />
      <div className="mx-auto w-full max-w-6xl px-6 text-center">
        <motion.h2 
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
          className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          Toma el control de tu futuro financiero.
        </motion.h2>
        <motion.p 
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
          className="mt-4 max-w-xl mx-auto text-pretty text-base text-white/70 sm:text-lg"
        >
          Únete a MetaWeb Core y experimenta la gestión financiera con privacidad y seguridad sin precedentes.
        </motion.p>
        <motion.div 
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/auth"
            className="group inline-flex h-11 items-center justify-center rounded-full bg-[#D4B483] px-6 text-sm font-semibold text-black shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-all hover:brightness-95 hover:scale-105 active:scale-95"
          >
            Comenzar ahora
            <ArrowRightIcon className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
          >
            Explorar demo
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
