"use client";

import { readUIMessageStream, type FileUIPart, type UIMessage, type UIMessageChunk } from "ai";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/SaaS/dashboard/components/ai-elements/attachments";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/SaaS/dashboard/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/SaaS/dashboard/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/SaaS/dashboard/components/ai-elements/prompt-input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/SaaS/dashboard/components/ui/breadcrumb";
import { Separator } from "@/SaaS/dashboard/components/ui/separator";
import { SidebarTrigger } from "@/SaaS/dashboard/components/ui/sidebar";
import { GlobeIcon } from "lucide-react";
import { useRef, useState } from "react";
import { nanoid } from "nanoid";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const models = [
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
];

async function* readSseData(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const eventEnd = buffer.indexOf("\n\n");
      if (eventEnd === -1) break;

      const rawEvent = buffer.slice(0, eventEnd);
      buffer = buffer.slice(eventEnd + 2);

      const lines = rawEvent.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trimStart();
        if (data === "[DONE]") return;
        if (data) yield data;
      }
    }
  }
}

export const ChatPage = ({ pageTitle }: { pageTitle: string }) => {
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("ready");
    setError(null);
  };

  const SubmitButton = () => {
    const attachments = usePromptInputAttachments();
    const disabled = status === "submitted" || (!text && attachments.files.length === 0);
    return (
      <PromptInputSubmit
        className="rounded-full bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
        disabled={disabled}
        onStop={stop}
        status={status}
      />
    );
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    stop();
    setStatus("submitted");
    setError(null);

    const parts: UIMessage["parts"] = [];
    if (message.text) {
      parts.push({ text: message.text, type: "text" });
    }
    for (const file of (message.files ?? []) as FileUIPart[]) {
      parts.push(file);
    }

    const nextMessages: UIMessage[] = [
      ...messages,
      {
        id: nanoid(),
        parts,
        role: "user",
      },
    ];

    setMessages(nextMessages);
    setText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        body: JSON.stringify({
          messages: nextMessages,
          model,
          webSearch: useWebSearch,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const details = await res.text().catch(() => "");
        setError(details || `HTTP ${res.status}`);
        setStatus("error");
        return;
      }

      setStatus("streaming");

      const chunkStream = new ReadableStream<UIMessageChunk>({
        async start(controller) {
          try {
            for await (const data of readSseData(res.body!)) {
              try {
                controller.enqueue(JSON.parse(data) as UIMessageChunk);
              } catch {
                continue;
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      });

      for await (const uiMessage of readUIMessageStream<UIMessage>({
        stream: chunkStream,
      })) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === uiMessage.id);
          if (idx === -1) {
            return [...prev, uiMessage];
          }
          const next = [...prev];
          next[idx] = uiMessage;
          return next;
        });
      }

      setStatus("ready");
    } catch {
      if (controller.signal.aborted) {
        setStatus("ready");
        return;
      }
      setError("No se pudo completar la respuesta de IA.");
      setStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

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
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-semibold tracking-tight">{pageTitle}</div>
            <div className="text-sm text-muted-foreground">
              Escribe tu pregunta y recibe una respuesta. Puedes adjuntar archivos.
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30">
            <Conversation className="flex-1">
              <ConversationContent className="p-4">
                {messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Empieza escribiendo un mensaje.
                  </div>
                ) : null}
                {messages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "rounded-2xl bg-[#dcf8c6] px-4 py-3 text-[#0b141a] shadow-sm"
                          : "rounded-2xl border border-border bg-background px-4 py-3 text-foreground shadow-sm"
                      }
                    >
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                ))}
              </ConversationContent>
              <ConversationScrollButton className="mb-3" />
            </Conversation>

            {status === "error" && error ? (
              <div className="px-4 pb-2 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="border-t border-border bg-background/70 p-3">
              <PromptInput
                onSubmit={handleSubmit}
                className="rounded-2xl bg-background p-2 shadow-sm ring-1 ring-border [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent"
                globalDrop
                multiple
              >
                <PromptInputHeader>
                  <PromptInputAttachmentsDisplay />
                </PromptInputHeader>
                <PromptInputBody>
                  <PromptInputTextarea
                    onChange={(e) => setText(e.target.value)}
                    value={text}
                    placeholder="Escribe tu mensaje…"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                        <PromptInputActionAddScreenshot />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    <PromptInputButton
                      onClick={() => setUseWebSearch(!useWebSearch)}
                      tooltip={{ content: "Search the web", shortcut: "⌘K" }}
                      variant={useWebSearch ? "default" : "ghost"}
                      className="rounded-full"
                    >
                      <GlobeIcon size={16} />
                      <span>Web</span>
                    </PromptInputButton>
                    {models.length > 1 ? (
                      <PromptInputSelect
                        onValueChange={(value) => {
                          setModel(value);
                        }}
                        value={model}
                      >
                        <PromptInputSelectTrigger className="rounded-full">
                          <span className="text-xs">Modelo:</span>
                          <PromptInputSelectValue />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          {models.map((model) => (
                            <PromptInputSelectItem key={model.id} value={model.id}>
                              {model.name}
                            </PromptInputSelectItem>
                          ))}
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                    ) : null}
                  </PromptInputTools>
                  <SubmitButton />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function IAPage() {
  return <ChatPage pageTitle="IA" />;
}
