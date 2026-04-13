import type { NextApiRequest, NextApiResponse } from "next"

type VerifyResponse = { ok: true } | { ok: false; error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  const secret = process.env.HCAPTCHA_SECRET
  if (!secret) {
    return res.status(500).json({ ok: false, error: "Missing HCAPTCHA_SECRET" })
  }

  const token =
    typeof req.body?.token === "string"
      ? req.body.token
      : typeof req.query?.token === "string"
        ? req.query.token
        : null

  if (!token) {
    return res.status(400).json({ ok: false, error: "Missing token" })
  }

  const remoteip =
    typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]?.split(",")[0]?.trim()
        : typeof req.socket.remoteAddress === "string"
          ? req.socket.remoteAddress
          : undefined

  const form = new URLSearchParams()
  form.set("secret", secret)
  form.set("response", token)
  if (remoteip) form.set("remoteip", remoteip)

  try {
    const verifyRes = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })

    const data = (await verifyRes.json()) as { success?: boolean }

    if (!data?.success) {
      return res.status(400).json({ ok: false, error: "Captcha inválido" })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ ok: false, error: "Captcha verify failed" })
  }
}

