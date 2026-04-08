import { google } from "@ai-sdk/google"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    model,
    messages,
  }: {
    messages: UIMessage[]
    model: string
    webSearch?: boolean
  } = await req.json()

  if (model.includes("embedding")) {
    return new Response(
      "Ese modelo es de embeddings (vectores) y no sirve para chat. Usa un modelo de texto como google/gemini-2.0-flash u openai/gpt-4o.",
      { status: 400 }
    )
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Falta configurar GOOGLE_GENERATIVE_AI_API_KEY en las variables de entorno del servidor.",
      { status: 500 }
    )
  }

  const raw = typeof model === "string" ? model : ""
  const modelId = raw.startsWith("google/")
    ? raw.slice("google/".length)
    : raw.startsWith("gemini-")
      ? raw
      : ""

  if (!modelId) {
    return new Response(
      "Por ahora solo está configurado Gemini. Usa un modelo como google/gemini-2.0-flash.",
      { status: 400 }
    )
  }

  try {
    const result = streamText({
      model: google(modelId),
      messages: await convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
