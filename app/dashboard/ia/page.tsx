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
import { AppSidebar } from "@/SaaS/dashboard/components/app-sidebar";
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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/SaaS/dashboard/components/ui/sidebar";
import { TooltipProvider } from "@/SaaS/dashboard/components/ui/tooltip";
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
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-opus-4-20250514", name: "Claude 4 Opus" },
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

const InputDemo = () => {
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
        className="bg-[#87a9a6] text-[#171f25] hover:bg-[#87a9a6]/90"
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
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
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
                    <BreadcrumbPage>IA</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-xl bg-background">
              <Conversation className="flex-1">
                <ConversationContent className="p-4">
                  {messages.map((message) => (
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
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
                <ConversationScrollButton />
              </Conversation>
              {status === "error" && error ? (
                <div className="px-4 pb-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <PromptInput
                onSubmit={handleSubmit}
                className="bg-background p-3 [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent"
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
                    >
                      <GlobeIcon size={16} />
                      <span>Search</span>
                    </PromptInputButton>
                    <PromptInputSelect
                      onValueChange={(value) => {
                        setModel(value);
                      }}
                      value={model}
                    >
                      <PromptInputSelectTrigger>
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
                  </PromptInputTools>
                  <SubmitButton />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default InputDemo;
