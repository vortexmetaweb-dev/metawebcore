"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type MessageContextValue = {
  isUser: boolean
}

const MessageContext = React.createContext<MessageContextValue | null>(null)

function useMessage() {
  const ctx = React.useContext(MessageContext)
  if (!ctx) {
    throw new Error("Message components must be used within <Message>")
  }
  return ctx
}

function Message({
  className,
  from,
  ...props
}: React.ComponentProps<"div"> & { from: "user" | "assistant" | string }) {
  const isUser = from === "user"

  return (
    <MessageContext.Provider value={{ isUser }}>
      <div
        data-slot="message"
        data-from={from}
        className={cn(isUser ? "flex justify-end" : "flex justify-start", className)}
        {...props}
      />
    </MessageContext.Provider>
  )
}

function MessageContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isUser } = useMessage()

  return (
    <div
      data-slot="message-content"
      className={cn(
        "max-w-[80%] rounded-lg px-4 py-2 text-sm",
        isUser ? "bg-[#171f25] text-white" : "bg-muted text-foreground",
        className
      )}
      {...props}
    />
  )
}

function MessageResponse({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-response"
      className={cn("whitespace-pre-wrap", className)}
      {...props}
    />
  )
}

export { Message, MessageContent, MessageResponse }
