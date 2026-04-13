"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, PlusIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const faqs = [
  {
    question: "¿Qué puedo hacer con MetaWeb Core?",
    answer:
      "Registrar ingresos y gastos, revisar balances, ordenar tus categorías y dar seguimiento a metas. Todo con una interfaz simple para decidir rápido.",
  },
  {
    question: "¿Puedo usarlo desde el celular?",
    answer:
      "Sí. La interfaz es responsive y está pensada para que puedas consultar tu información desde cualquier pantalla, sin perder claridad.",
  },
  {
    question: "¿Cómo se protege mi información?",
    answer:
      "Evitamos exponer datos sensibles en la interfaz y cuidamos los flujos de autenticación. Además, puedes cerrar sesión y controlar tus accesos desde tu cuenta.",
  },
  {
    question: "¿Puedo exportar o revisar mi historial?",
    answer:
      "Tienes un historial centralizado para revisar movimientos. Si necesitas exportación, se puede agregar como opción en la sección de reportes.",
  },
  {
    question: "¿Qué pasa si tengo dudas o necesito soporte?",
    answer:
      "Puedes escribirnos desde el panel o desde la sección de soporte. Respondemos con guías claras y pasos concretos para que sigas avanzando.",
  },
] as const

export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  return (
    <section id="faq" className="w-full bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-120px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Preguntas frecuentes
            </h2>
            <p className="mt-4 max-w-md text-pretty text-base text-white/70">
              Respuestas rápidas a lo que normalmente preguntan antes de crear
              una cuenta.
            </p>
            <Link
              href="#support"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#D4B483] hover:brightness-110"
            >
              Hablar con soporte
              <ArrowRightIcon className="size-4" />
            </Link>
          </motion.div>

          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-120px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3">
              {faqs.map((item, index) => {
                const isOpen = openIndex === index
                const contentId = `faq-item-${index}`

                return (
                  <div
                    key={item.question}
                    className="border-t border-white/10 first:border-t-0"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={contentId}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#D4B483]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      onClick={() =>
                        setOpenIndex((prev) => (prev === index ? null : index))
                      }
                    >
                      <span className="text-base font-semibold tracking-tight text-white">
                        {item.question}
                      </span>
                      <span
                        className={[
                          "grid size-10 shrink-0 place-items-center rounded-full border border-white/10 transition-colors",
                          isOpen
                            ? "bg-[#D4B483] text-black"
                            : "bg-[#D4B483]/12 text-[#D4B483]",
                        ].join(" ")}
                      >
                        <PlusIcon
                          className={[
                            "size-5 transition-transform duration-200",
                            isOpen ? "rotate-45" : "rotate-0",
                          ].join(" ")}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          key="content"
                          id={contentId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-6 text-sm leading-relaxed text-white/70">
                            {item.answer}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
