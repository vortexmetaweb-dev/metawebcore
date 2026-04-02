"use client"

import * as React from "react"
import { PaperclipIcon, XIcon } from "lucide-react"
import Image from "next/image"

import { Button } from "@/SaaS/dashboard/components/ui/button"
import { cn } from "@/lib/utils"

type AttachmentData = {
  id: string
  filename?: string
  mediaType?: string
  url?: string
}

type AttachmentContextValue = {
  data: AttachmentData
  onRemove?: () => void
}

const AttachmentContext = React.createContext<AttachmentContextValue | null>(null)

function useAttachment() {
  const ctx = React.useContext(AttachmentContext)
  if (!ctx) {
    throw new Error("Attachment components must be used within <Attachment>")
  }
  return ctx
}

function Attachments({
  className,
  variant = "inline",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "inline"
}) {
  return (
    <div
      data-slot="attachments"
      data-variant={variant}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

function Attachment({
  className,
  data,
  onRemove,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: AttachmentData
  onRemove?: () => void
  children: React.ReactNode
}) {
  return (
    <AttachmentContext.Provider value={{ data, onRemove }}>
      <div
        data-slot="attachment"
        className={cn(
          "relative flex items-center gap-2 rounded-lg border border-input bg-background px-2 py-1 text-xs",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  )
}

function AttachmentPreview({ className, ...props }: React.ComponentProps<"div">) {
  const { data } = useAttachment()

  const isImage =
    typeof data.mediaType === "string" && data.mediaType.startsWith("image/")

  return (
    <div
      data-slot="attachment-preview"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {isImage && data.url ? (
        <Image
          alt={data.filename ?? "Attachment"}
          className="size-8 rounded-md object-cover"
          height={32}
          src={data.url}
          unoptimized
          width={32}
        />
      ) : (
        <div className="grid size-8 place-items-center rounded-md bg-muted">
          <PaperclipIcon className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="max-w-44 truncate text-foreground">
        {data.filename ?? "Archivo"}
      </div>
    </div>
  )
}

function AttachmentRemove({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "type" | "variant" | "size">) {
  const { onRemove } = useAttachment()

  return (
    <Button
      data-slot="attachment-remove"
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn("ml-auto", className)}
      onClick={() => onRemove?.()}
      {...props}
    >
      <XIcon className="size-3.5" />
    </Button>
  )
}

export { Attachments, Attachment, AttachmentPreview, AttachmentRemove }
