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

  const selectedModel = (webSearch ? "perplexity/sonar" : model) as unknown as LanguageModel

  const result = streamText({
    model: selectedModel,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
