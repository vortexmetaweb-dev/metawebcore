"use client"

import { motion } from "framer-motion"

export default function Banner() {
  return (
    <motion.section 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
      className="relative w-full overflow-hidden bg-[#D4B483] text-white border-b border-black/10"
    >
      <div className="relative mx-auto w-full max-w-6xl px-6 py-1.5">
        <div className="flex items-center justify-center gap-3 text-center">
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="inline-flex h-4.5 items-center rounded-full border border-white/35 bg-white/15 px-2 text-[10px] font-bold uppercase tracking-wider text-white"
          >
            Nuevo
          </motion.span>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-[11px] font-medium tracking-wide text-white/90"
          >
            Crea tu cuenta y mejora tus finanzas
          </motion.p>
        </div>
      </div>
    </motion.section>
  )
}
