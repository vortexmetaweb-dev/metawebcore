import { createClient, type Session } from "@supabase/supabase-js"
import { useRouter } from "next/router"
import { Manrope } from "next/font/google"
import * as React from "react"

import { Button } from "@/SaaS/dashboard/components/ui/button"

const manrope = Manrope({ subsets: ["latin"] })

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase env vars")
  }

  return { url, key }
}

function getUserDisplayName(session: Session) {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined
  const candidates = [
    typeof meta?.name === "string" ? meta.name : null,
    typeof meta?.full_name === "string" ? meta.full_name : null,
    typeof meta?.preferred_username === "string" ? meta.preferred_username : null,
    session.user.email ?? null,
  ].filter(Boolean) as string[]

  return candidates[0] ?? "Usuario"
}

export default function WelcomePage() {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null>(null)
  const [checkedSession, setCheckedSession] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      const { url, key } = getSupabaseConfig()
      const supabase = createClient(url, key)

      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session ?? null)
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Unknown error")
        })
        .finally(() => {
          setCheckedSession(true)
        })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => {
        data.subscription.unsubscribe()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
      return
    }
  }, [])

  React.useEffect(() => {
    if (!checkedSession) return
    if (session) return
    if (!router.isReady) return
    router.replace("/auth")
  }, [checkedSession, session, router])

  const name = session ? getUserDisplayName(session) : "Usuario"

  return (
    <div className={`${manrope.className} relative min-h-screen overflow-hidden bg-black text-white`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,#000000_0%,#0B0B0B_45%,#141414_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(212,180,131,0.22),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(900px_circle_at_85%_25%,rgba(255,255,255,0.06),transparent_60%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16 text-center">
        <div>
          <div className="text-sm font-semibold tracking-[0.22em] text-white/75">
            META WEB <span className="text-[#D4B483]">CORE</span>
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Bienvenido
          </h1>
          <div className="mx-auto mt-5 h-1 w-24 rounded-full bg-[#D4B483]" />
          <div className="mt-5 text-2xl font-medium text-white/90 md:text-3xl">
            {name}
          </div>

          <div className="mt-10 flex justify-center">
            <Button
              type="button"
              className="h-10 border border-black/10 bg-white px-7 text-black hover:bg-white/90 focus-visible:ring-4 focus-visible:ring-[#D4B483]/35"
              onClick={() => router.push("/dashboard")}
            >
              Continuar
            </Button>
          </div>

          {error ? (
            <div className="mx-auto mt-10 max-w-md rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-sm text-white/90">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
