import { createClient, type Session } from "@supabase/supabase-js"
import { useRouter } from "next/router"
import * as React from "react"

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
    <div className="relative min-h-screen overflow-hidden bg-[#171f25] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,#171f25_0%,#647b84_28%,#87a9a6_62%,#cfd9d8_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_15%_10%,rgba(23,31,37,0.35),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(900px_circle_at_90%_25%,rgba(135,169,166,0.55),transparent_55%)]"
      />
      <div aria-hidden="true" className="absolute inset-0 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16 text-center">
        <div>
          <div className="text-sm font-semibold tracking-[0.22em] text-white/75">
            META WEB CORE
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Bienvenido
          </h1>
          <div className="mt-4 text-2xl font-medium text-white/85 md:text-3xl">
            {name}
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
