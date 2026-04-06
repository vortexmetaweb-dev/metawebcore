"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { createClient, type Session } from "@supabase/supabase-js"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb"
import { Button } from "@/SaaS/dashboard/components/ui/button"
import { Input } from "@/SaaS/dashboard/components/ui/input"
import { Separator } from "@/SaaS/dashboard/components/ui/separator"
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar"
import { cn } from "@/lib/utils"

const CHATS_TABLE = process.env.NEXT_PUBLIC_SUPPORT_CHATS_TABLE ?? "support_chats"
const MESSAGES_TABLE =
  process.env.NEXT_PUBLIC_SUPPORT_CHAT_MESSAGES_TABLE ?? "support_chat_messages"
const TENANT_MEMBERS_TABLE =
  process.env.NEXT_PUBLIC_TENANT_MEMBERS_TABLE ?? "tenant_members"

type ChatMessage = {
  id: string
  from: "me" | "support"
  text: string
  createdAt: number
}

type LoadedMessageRow = {
  id: unknown
  from: unknown
  content: unknown
  created_at: unknown
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    return null
  }

  return { url, key }
}

function getActiveTenantKey(userId: string) {
  return `mwcore.activeTenant.${userId}`
}

function isMissingSchemaError(message: string) {
  const msg = message.toLowerCase()
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find") ||
    msg.includes("unknown column") ||
    msg.includes("column") ||
    msg.includes("relation")
  )
}

function formatTime(ts: number) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts))
  } catch {
    return ""
  }
}

export default function ChatSoportePage() {
  const supabase = React.useMemo(() => {
    const cfg = getSupabaseConfig()
    if (!cfg) return null
    return createClient(cfg.url, cfg.key)
  }, [])

  const [session, setSession] = React.useState<Session | null>(null)
  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [threadId, setThreadId] = React.useState<string>("")
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [loadingThread, setLoadingThread] = React.useState<boolean>(false)
  const [loadingMessages, setLoadingMessages] = React.useState<boolean>(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<string>("")
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])

  React.useEffect(() => {
    if (!supabase || !session) {
      setTenantId(null)
      return
    }

    let cancelled = false

    const resolveTenant = async () => {
      const stored =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(getActiveTenantKey(session.user.id))

      const { data: memberRows, error: memberError } = await supabase
        .from(TENANT_MEMBERS_TABLE)
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })

      if (cancelled) return

      if (memberError) {
        if (!isMissingSchemaError(memberError.message)) {
          setTenantId(null)
          setNotice("No se pudo resolver el espacio activo.")
          setError(memberError.message)
          return
        }
        setTenantId(null)
        return
      }

      const tenantIds = (memberRows ?? [])
        .map((r) => String((r as { tenant_id?: unknown }).tenant_id ?? ""))
        .filter(Boolean)

      const nextTenantId =
        (stored && tenantIds.includes(stored) && stored) || tenantIds[0] || null

      setTenantId(nextTenantId)
    }

    resolveTenant()

    const onTenantChange = () => {
      resolveTenant()
    }

    window.addEventListener("mwcore:tenant-change", onTenantChange)
    return () => {
      cancelled = true
      window.removeEventListener("mwcore:tenant-change", onTenantChange)
    }
  }, [session, supabase])

  React.useEffect(() => {
    if (!supabase || !session) {
      setThreadId("")
      setMessages([])
      return
    }

    let cancelled = false

    const loadThread = async () => {
      setLoadingThread(true)
      setNotice(null)
      setError(null)
      try {
        const baseQuery = supabase
          .from(CHATS_TABLE)
          .select("id, slug, name")
          .eq("slug", "soporte")
          .order("created_at", { ascending: true })
          .limit(1)

        const res = await (tenantId && tenantId !== "null"
          ? baseQuery.eq("tenant_id", tenantId)
          : baseQuery.eq("user_id", session.user.id))

        if (cancelled) return

        if (res.error) {
          if (!isMissingSchemaError(res.error.message)) {
            setNotice("No se pudieron cargar chats desde Supabase.")
            setError(res.error.message)
          }
          setThreadId("")
          return
        }

        const row = (res.data?.[0] ?? null) as unknown as
          | { id?: unknown; slug?: unknown; name?: unknown }
          | null

        if (row?.id) {
          setThreadId(String(row.id))
          return
        }

        const inserted = await supabase
          .from(CHATS_TABLE)
          .insert({
            slug: "soporte",
            name: "Soporte",
            tenant_id: tenantId && tenantId !== "null" ? tenantId : null,
            user_id: session.user.id,
          })
          .select("id")
          .single()

        if (cancelled) return

        if (inserted.error) {
          if (!isMissingSchemaError(inserted.error.message)) {
            setNotice("No se pudo crear el chat de soporte en Supabase.")
            setError(inserted.error.message)
          }
          setThreadId("")
          return
        }

        setThreadId(String((inserted.data as { id?: unknown }).id ?? ""))
      } finally {
        if (!cancelled) setLoadingThread(false)
      }
    }

    loadThread()

    return () => {
      cancelled = true
    }
  }, [session, supabase, tenantId])

  React.useEffect(() => {
    if (!supabase || !session || !threadId) {
      setMessages([])
      return
    }

    let cancelled = false

    const loadMessages = async () => {
      setLoadingMessages(true)
      setNotice(null)
      setError(null)
      try {
        const res = await supabase
          .from(MESSAGES_TABLE)
          .select("id, from, content, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true })
          .limit(200)

        if (cancelled) return

        if (res.error) {
          if (!isMissingSchemaError(res.error.message)) {
            setNotice("No se pudieron cargar mensajes desde Supabase.")
            setError(res.error.message)
          }
          setMessages([])
          return
        }

        const rows = (res.data ?? []) as unknown as LoadedMessageRow[]
        const mapped: ChatMessage[] = rows
          .map((row) => {
            const id = String(row.id ?? "")
            const fromRaw = String(row.from ?? "")
            const from =
              fromRaw === "support" || fromRaw === "me" ? (fromRaw as "support" | "me") : "support"
            const text = String(row.content ?? "")
            const createdAt = row.created_at ? new Date(String(row.created_at)).getTime() : 0
            if (!id || !createdAt) return null
            return { id, from, text, createdAt }
          })
          .filter(Boolean) as ChatMessage[]

        setMessages(mapped)
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [session, supabase, threadId])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" })
  }, [threadId, messages.length])

  const sendMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !supabase || !session || !threadId) return

    const now = Date.now()
    const optimistic: ChatMessage = {
      id: `local-${nanoid()}`,
      from: "me",
      text: trimmed,
      createdAt: now,
    }

    setMessages((prev) => [...prev, optimistic])
    setDraft("")

    supabase
      .from(MESSAGES_TABLE)
      .insert({
        thread_id: threadId,
        tenant_id: tenantId && tenantId !== "null" ? tenantId : null,
        user_id: session.user.id,
        from: "me",
        content: trimmed,
      })
      .select("id, from, content, created_at")
      .single()
      .then(async ({ data, error }) => {
        if (error) {
          if (!isMissingSchemaError(error.message)) {
            setNotice("No se pudo guardar el mensaje en Supabase.")
            setError(error.message)
          }
          return
        }

        const saved: ChatMessage = {
          id: String((data as { id?: unknown }).id ?? ""),
          from: "me",
          text: String((data as { content?: unknown }).content ?? trimmed),
          createdAt: (data as { created_at?: unknown }).created_at
            ? new Date(String((data as { created_at?: unknown }).created_at)).getTime()
            : now,
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? saved : m))
        )

        await supabase
          .from(CHATS_TABLE)
          .update({
            last_message: saved.text,
            last_message_at: new Date(saved.createdAt).toISOString(),
          })
          .eq("id", threadId)
      })
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">MetaWeb Core</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Chat soporte</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-1 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">Soporte</div>
              <div className="text-xs text-muted-foreground">
                {loadingThread ? "Conectando…" : "Escríbenos y te ayudamos"}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-1 py-4">
            {notice || error ? (
              <div className="mb-3 rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="text-foreground">{notice ?? "Error"}</div>
                {error ? (
                  <div className="mt-1 text-xs text-muted-foreground">{error}</div>
                ) : null}
              </div>
            ) : null}

            {!session ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Inicia sesión para enviar mensajes a soporte
              </div>
            ) : loadingMessages ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Cargando mensajes…
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay mensajes
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((m) => {
                  const isMe = m.from === "me"
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", isMe ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          isMe
                            ? "bg-[#dcf8c6] text-[#0b141a]"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{m.text}</div>
                        <div className="mt-1 text-right text-[10px] text-muted-foreground">
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t bg-background px-1 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(draft)
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
            />
            <Button type="submit" disabled={!draft.trim() || !session || !threadId}>
              Enviar
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
