import type { NextApiRequest, NextApiResponse } from "next"

type VerifyResponse =
  | { ok: true }
  | { ok: false; error: string; codes?: string[] }

type HcaptchaVerifyResult = {
  success?: boolean
  "error-codes"?: string[]
}

function messageFromCodes(codes: string[] | undefined) {
  const list = codes ?? []
  if (list.includes("missing-input-secret")) return "Falta el secret del captcha"
  if (list.includes("invalid-input-secret")) return "Secret del captcha inválido"
  if (list.includes("missing-input-response")) return "Falta el token del captcha"
  if (list.includes("invalid-input-response")) return "Captcha expirado o inválido"
  if (list.includes("bad-request")) return "Solicitud inválida"
  if (list.includes("sitekey-secret-mismatch")) return "Site key/secret no coinciden"
  return "Captcha inválido"
}

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

  const form = new URLSearchParams()
  form.set("secret", secret)
  form.set("response", token)

  try {
    const verifyRes = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })

    const data = (await verifyRes.json()) as HcaptchaVerifyResult

    if (!data?.success) {
      const codes = data?.["error-codes"]
      return res
        .status(400)
        .json({ ok: false, error: messageFromCodes(codes), codes })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ ok: false, error: "Captcha verify failed" })
  }
}
