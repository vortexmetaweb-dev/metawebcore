"use client"

import * as React from "react"

import { Button } from "@/SaaS/dashboard/components/ui/button"
import { cn } from "@/lib/utils"

type ConversationContextValue = {
  registerScrollContainer: (el: HTMLDivElement | null) => void
  scrollToBottom: () => void
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null)

function useConversation() {
  const ctx = React.useContext(ConversationContext)
  if (!ctx) {
    throw new Error("Conversation components must be used within <Conversation>")
  }
  return ctx
}

function Conversation({ className, children, ...props }: React.ComponentProps<"div">) {
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)

  const registerScrollContainer = React.useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el
  }, [])

  const scrollToBottom = React.useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [])

  const value = React.useMemo(
    () => ({ registerScrollContainer, scrollToBottom }),
    [registerScrollContainer, scrollToBottom]
  )

  return (
    <ConversationContext.Provider value={value}>
      <div
        data-slot="conversation"
        className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  )
}

function ConversationContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { registerScrollContainer } = useConversation()
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight })
    })
  }, [children])

  return (
    <div
      ref={(el) => {
        contentRef.current = el
        registerScrollContainer(el)
      }}
      data-slot="conversation-content"
      className={cn("min-h-0 flex-1 overflow-y-auto p-3", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ConversationScrollButton({
  className,
  children = "Bajar",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { scrollToBottom } = useConversation()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("mt-2 self-center", className)}
      onClick={scrollToBottom}
      {...props}
    >
      {children}
    </Button>
  )
}

export { Conversation, ConversationContent, ConversationScrollButton }
