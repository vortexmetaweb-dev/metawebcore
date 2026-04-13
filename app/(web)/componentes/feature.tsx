"use client"

import Image, { type StaticImageData } from "next/image"
import Link from "next/link"
import { ArrowRightIcon, PlusIcon } from "lucide-react"
import { motion } from "framer-motion"

import care1Image from "../src/care1.png"
import core2Image from "../src/core2.jpg"
import core4Image from "../src/core4.png"

function CardIllustration({
  type,
}: {
  type: "copy" | "build" | "streamline"
}) {
  const common =
    "absolute inset-0 rounded-[28px] bg-[radial-gradient(700px_circle_at_20%_10%,rgba(212,180,131,0.12),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_45%)]"

  if (type === "copy") {
    return (
      <div className="relative h-40 w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
        <div aria-hidden="true" className={common} />
        <Image
          alt="care"
          className="relative h-full w-full object-cover opacity-90"
          src={care1Image}
        />
      </div>
    )
  }

  if (type === "build") {
    return (
      <div className="relative h-40 w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
        <div aria-hidden="true" className={common} />
        <svg
          className="relative mx-auto mt-5 h-30 w-[88%] text-white/70"
          viewBox="0 0 460 170"
          fill="none"
        >
          <path
            d="M120 116c56-36 88-64 116-98"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M240 22l40-8-16 38"
            className="stroke-current"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M256 40l-18 6 6-18"
            className="stroke-current"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <path
            d="M240 22l-10 22 26-14"
            className="fill-current"
            opacity="0.12"
          />

          <path
            d="M166 76c40 18 64 34 92 60"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M170 40c26 18 40 36 46 58"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M214 104c12 10 26 26 34 42"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />

          <circle cx="124" cy="110" r="24" className="fill-current" opacity="0.12" />
          <path
            d="M116 118c8 6 22 6 30 0"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M112 104l8 6M144 110l8-6"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />

          <path
            d="M310 34l18 12-18 12-18-12 18-12Z"
            className="stroke-current"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M310 58v24"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M286 96h48"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M332 116l10 10M352 116l-10 10"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
      <div aria-hidden="true" className={common} />
      <svg
        className="relative mx-auto mt-6 h-28 w-[88%] text-white/70"
        viewBox="0 0 460 170"
        fill="none"
      >
        <rect
          x="68"
          y="28"
          width="210"
          height="126"
          rx="18"
          className="stroke-current"
          strokeWidth="2"
        />
        <rect
          x="78"
          y="38"
          width="68"
          height="18"
          rx="9"
          className="fill-current"
          opacity="0.18"
        />
        <circle cx="98" cy="47" r="3.5" className="fill-current" />
        <circle cx="110" cy="47" r="3.5" className="fill-current" />
        <circle cx="122" cy="47" r="3.5" className="fill-current" />

        <rect
          x="210"
          y="48"
          width="210"
          height="126"
          rx="18"
          className="stroke-current"
          strokeWidth="2"
          opacity="0.9"
        />
        <rect
          x="220"
          y="58"
          width="70"
          height="18"
          rx="9"
          className="fill-current"
          opacity="0.18"
        />
        <circle cx="240" cy="67" r="3.5" className="fill-current" />
        <circle cx="252" cy="67" r="3.5" className="fill-current" />
        <circle cx="264" cy="67" r="3.5" className="fill-current" />

        <path
          d="M252 116h128"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <rect
          x="252"
          y="130"
          width="100"
          height="12"
          rx="6"
          className="fill-current"
          opacity="0.12"
        />

        <path
          d="M164 92h60"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M188 78v28"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  illustration,
  href,
  image,
}: {
  title?: string
  description?: string
  illustration: "copy" | "build" | "streamline"
  href?: string
  image?: StaticImageData
}) {
  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
    },
    hover: { 
      y: -8, 
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeInOut" } 
    }
  }

  const card = image ? (
    <motion.div 
      variants={cardVariants}
      whileInView="animate"
      initial="initial"
      viewport={{ once: false, margin: "-50px" }}
      whileHover="hover"
      className="group relative h-72 w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/3 sm:h-80"
    >
      <Image
        alt={title ?? "Feature"}
        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        src={image}
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 transition-opacity duration-300 group-hover:from-black/90">
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-white/70 line-clamp-2 group-hover:text-white/90">
          {description}
        </p>
      </div>
    </motion.div>
  ) : (
    <motion.div 
      variants={cardVariants}
      whileInView="animate"
      initial="initial"
      viewport={{ once: false, margin: "-50px" }}
      whileHover="hover"
      className="group relative h-full rounded-[28px] border border-white/10 bg-white/3 p-5 transition-colors hover:bg-white/5"
    >
      <CardIllustration type={illustration} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-balance text-base font-semibold tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-white/65">{description}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#D4B483]/12 text-[#D4B483] transition-colors group-hover:bg-[#D4B483]/18">
          <PlusIcon className="size-5" />
        </span>
      </div>
    </motion.div>
  )

  if (!href) return card

  return (
    <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[#D4B483]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
      {card}
    </Link>
  )
}

export default function Feature() {
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
  }

  return (
    <section
      id="funcionalidades"
      className="relative w-full overflow-hidden bg-black text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_15%,rgba(212,180,131,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_70%,rgba(255,255,255,0.035),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_40%)]"
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
          variants={containerVariants}
          className="grid gap-6 md:grid-cols-12 md:items-start"
        >
          <motion.div variants={fadeInUp} className="md:col-span-7">
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Privacidad de alto nivel.
            </h2>
          </motion.div>
          <motion.div variants={fadeInUp} className="md:col-span-5 md:pt-2">
            <p className="text-sm leading-relaxed text-white/65">
              Control absoluto sobre tu patrimonio con seguridad de grado bancario. 
              Estructura clara y decisiones rápidas en un entorno totalmente privado.
            </p>
            <Link
              href="#documentacion"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#D4B483] hover:brightness-110"
            >
              Leer más
              <ArrowRightIcon className="size-4" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, margin: "-100px" }}
          variants={containerVariants}
          className="mt-10 grid gap-4 md:grid-cols-3"
        >
          <FeatureCard
            title="Gestión de Gastos"
            description="Control total de egresos con categorías inteligentes."
            illustration="copy"
            image={care1Image}
            href="#"
          />
          <FeatureCard
            title="Ingresos Seguros"
            description="Monitoreo de flujos con privacidad de grado bancario."
            illustration="build"
            image={core4Image}
            href="#"
          />
          <FeatureCard
            title="Metas de Ahorro"
            description="Proyecta tu futuro con herramientas de alta fidelidad."
            illustration="streamline"
            image={core2Image}
            href="#"
          />
        </motion.div>
      </div>
    </section>
  )
}
