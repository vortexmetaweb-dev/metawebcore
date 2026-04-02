import { createClient } from "@supabase/supabase-js"
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

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!router.isReady) return

    async function run() {
      try {
        const { url, key } = getSupabaseConfig()
        const supabase = createClient(url, key)

        const code = typeof router.query.code === "string" ? router.query.code : null

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setError(error.message)
            return
          }

          await router.replace("/welcome")
          return
        }

        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        )

        const access_token = hashParams.get("access_token")
        const refresh_token = hashParams.get("refresh_token")

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            setError(error.message)
            return
          }

          await router.replace("/welcome")
          return
        }

        await router.replace("/auth")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error")
      }
    }

    run()
  }, [router.isReady, router.query.code, router])

  return (
    <div className="min-h-screen bg-white text-[#171f25]">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="w-full rounded-xl border border-[#cfd9d8] bg-white p-6 text-center">
          <div className="text-sm font-medium">Conectando…</div>
          {error ? (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
