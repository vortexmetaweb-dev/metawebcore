import { createClient, type Session } from "@supabase/supabase-js"
import Link from "next/link"
import { Manrope } from "next/font/google"
import { useRouter } from "next/router"
import { Command } from "lucide-react"
import * as React from "react"
import HCaptcha from "@hcaptcha/react-hcaptcha"

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

function createSupabaseClient() {
  const { url, key } = getSupabaseConfig()
  return createClient(url, key, {
    global: {
      headers: { apikey: key },
    },
  })
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

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 .5C5.648.5.5 5.79.5 12.327c0 5.223 3.292 9.656 7.862 11.22.575.11.786-.254.786-.567 0-.28-.01-1.022-.016-2.007-3.2.713-3.876-1.58-3.876-1.58-.523-1.363-1.277-1.726-1.277-1.726-1.044-.733.08-.718.08-.718 1.154.084 1.762 1.215 1.762 1.215 1.026 1.803 2.692 1.282 3.348.98.104-.767.402-1.282.73-1.577-2.554-.298-5.24-1.312-5.24-5.84 0-1.29.447-2.345 1.182-3.172-.12-.297-.512-1.498.112-3.122 0 0 .966-.317 3.164 1.212.918-.262 1.903-.394 2.88-.398.978.004 1.964.136 2.884.398 2.195-1.529 3.16-1.212 3.16-1.212.627 1.624.235 2.825.116 3.122.737.827 1.18 1.882 1.18 3.172 0 4.54-2.69 5.538-5.252 5.83.413.367.78 1.093.78 2.205 0 1.59-.015 2.872-.015 3.263 0 .316.207.683.793.566 4.567-1.567 7.855-5.997 7.855-11.219C23.5 5.79 18.352.5 12 .5Z" />
    </svg>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.24 1.26-.96 2.34-2.04 3.06l3.3 2.55c1.92-1.77 3.03-4.38 3.03-7.47 0-.72-.06-1.41-.18-2.04H12z"
      />
      <path
        fill="#34A853"
        d="M6.57 14.28l-.9.69-3.18 2.48C4.47 20.73 8.01 23 12 23c2.7 0 4.95-.9 6.6-2.43l-3.3-2.55c-.9.6-2.07.96-3.3.96-2.55 0-4.71-1.71-5.49-4.02z"
      />
      <path
        fill="#4A90E2"
        d="M2.49 6.54C1.86 7.83 1.5 9.27 1.5 10.8s.36 2.97.99 4.26l3.96-3.09c-.21-.63-.33-1.29-.33-1.97s.12-1.34.33-1.97z"
      />
      <path
        fill="#FBBC05"
        d="M12 4.62c1.47 0 2.79.51 3.84 1.5l2.88-2.88C16.95 1.59 14.7.6 12 .6 8.01.6 4.47 2.87 2.49 6.54l3.96 3.09C7.29 6.33 9.45 4.62 12 4.62z"
      />
    </svg>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [session, setSession] = React.useState<Session | null>(null)
  const [busy, setBusy] = React.useState<"email" | "github" | "google" | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const [captchaVerified, setCaptchaVerified] = React.useState(false)
  const [captchaBusy, setCaptchaBusy] = React.useState(false)

  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""

  const resetCaptcha = React.useCallback(() => {
    setCaptchaToken(null)
    setCaptchaVerified(false)
  }, [])

  const verifyCaptcha = React.useCallback(async () => {
    if (captchaVerified) return true
    if (!hcaptchaSiteKey) {
      setError("Falta configurar hCaptcha (site key).")
      return false
    }
    if (!captchaToken) {
      setError("Completa el captcha para continuar.")
      return false
    }

    setCaptchaBusy(true)
    try {
      const res = await fetch("/api/verify-hcaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Captcha inválido")
        resetCaptcha()
        return false
      }
      setCaptchaVerified(true)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Captcha verify failed")
      resetCaptcha()
      return false
    } finally {
      setCaptchaBusy(false)
    }
  }, [captchaToken, captchaVerified, hcaptchaSiteKey, resetCaptcha])

  React.useEffect(() => {
    try {
      const supabase = createSupabaseClient()

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => {
        data.subscription.unsubscribe()
      }
    } catch {
      return
    }
  }, [])

  React.useEffect(() => {
    if (!session) return
    router.replace("/welcome")
  }, [session, router])

  async function signInWithProvider(provider: "github" | "google") {
    setError(null)
    setInfo(null)
    if (!(await verifyCaptcha())) return
    setBusy(provider)

    try {
      const supabase = createSupabaseClient()

      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })

      if (error) {
        setError(error.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setBusy(null)
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!(await verifyCaptcha())) return
    setBusy("email")

    try {
      const supabase = createSupabaseClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setInfo("Te enviamos un enlace a tu email para iniciar sesión.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setBusy(null)
    }
  }

  async function signOut() {
    setError(null)
    setInfo(null)
    setBusy("email")

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.auth.signOut()
      if (error) setError(error.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`${manrope.className} grid min-h-screen w-full bg-white text-[#171f25] md:grid-cols-2`}>
      <aside className="relative hidden p-10 md:flex md:flex-col">
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

        <div className="relative z-10 flex items-center gap-2 text-sm text-white/80 font-semibold">
          <Command className="size-5" />
          <span>
            MetaWeb <span className="text-[#D4B483]">Core</span>
          </span>
        </div>

        <div className="flex-1" />

        <blockquote className="relative z-10 max-w-md text-sm leading-relaxed text-white/80">
          Finanzas personales
          <span className="block pt-2 font-medium text-white/80">
            MetaWeb Dev Solutions
          </span>
        </blockquote>
      </aside>

      <main className="relative flex flex-col bg-white px-6 py-12 md:px-12">
        <div className="absolute left-6 top-6 flex items-center gap-2 text-sm font-semibold md:hidden">
          <Command className="size-5" />
          <span>MetaWeb Core</span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm pt-10 md:pt-0">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Acceso</h1>
              <p className="mt-2 text-sm text-[#64787c]">
                Inicia sesión con tu email, GitHub o Google
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {session ? (
                <div className="rounded-lg border border-[#cfd9d8] bg-white px-4 py-3 text-sm text-[#171f25]">
                  <div className="font-medium">
                    Bienvenido, {getUserDisplayName(session)}
                  </div>
                  <div className="mt-1 text-[#64787c]">Sesión iniciada</div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-9 w-full border-[#cfd9d8] bg-white text-[#171f25] hover:bg-[#cfd9d8]/40"
                    onClick={signOut}
                    disabled={busy !== null}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="rounded-lg border border-[#cfd9d8] bg-[#cfd9d8]/30 px-4 py-3 text-sm text-[#171f25]">
                  {info}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={signInWithEmail}>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-md border border-[#cfd9d8] bg-white px-3 text-sm text-[#171f25] outline-none ring-offset-white placeholder:text-[#64787c] focus-visible:border-[#87a9a6] focus-visible:ring-4 focus-visible:ring-[#87a9a6]/30"
                />

                {hcaptchaSiteKey ? (
                  <div className="flex justify-center">
                    <HCaptcha
                      sitekey={hcaptchaSiteKey}
                      onVerify={(token) => {
                        setCaptchaToken(token)
                        setCaptchaVerified(false)
                      }}
                      onExpire={resetCaptcha}
                      onError={resetCaptcha}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#cfd9d8] bg-white px-4 py-3 text-sm text-[#171f25]">
                    Falta configurar hCaptcha.
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-10 w-full bg-[#171f25] text-white hover:bg-[#171f25]/90"
                  disabled={busy !== null || captchaBusy || !captchaToken}
                >
                  {busy === "email" ? "Enviando…" : "Continuar con Email"}
                </Button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#cfd9d8]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-[#64787c]">
                    O continúa con
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full border-[#cfd9d8] bg-white text-[#171f25] hover:bg-[#cfd9d8]/40"
                onClick={() => signInWithProvider("github")}
                disabled={busy !== null || captchaBusy || !captchaToken}
              >
                <GitHubIcon className="mr-2 size-4" />
                {busy === "github" ? "Conectando…" : "GitHub"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full border-[#cfd9d8] bg-white text-[#171f25] hover:bg-[#cfd9d8]/40"
                onClick={() => signInWithProvider("google")}
                disabled={busy !== null || captchaBusy || !captchaToken}
              >
                <GoogleIcon className="mr-2 size-4" />
                {busy === "google" ? "Conectando…" : "Google"}
              </Button>

              <p className="pt-2 text-center text-xs text-[#64787c]">
                Al continuar, aceptas nuestros{" "}
                <Link
                  href="#"
                  className="underline underline-offset-4 hover:text-[#647b84]"
                >
                  Términos de Servicio
                </Link>{" "}
                y{" "}
                <Link
                  href="#"
                  className="underline underline-offset-4 hover:text-[#647b84]"
                >
                  Política de Privacidad
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
