import { convertToModelMessages, streamText, type LanguageModel, type UIMessage } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    model,
    messages,
    webSearch,
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

  const selectedModel = (webSearch ? "perplexity/sonar" : model) as unknown as LanguageModel

  try {
    const result = streamText({
      model: selectedModel,
      messages: await convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return new Response(message, { status: 500 })
  }
}
