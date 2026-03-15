import env from '#start/env'

type VerifyResponse = {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

export default class RecaptchaService {
  static extractToken(body: Record<string, any>): string | null {
    const keys = ['recaptcha', 'reCaptcha', 'recaptchaToken', 'token_captcha', 'captchaToken']
    for (const k of keys) {
      const v = body?.[k]
      if (typeof v === 'string' && v.trim().length > 0) return v.trim()
    }
    return null
  }

  static async verify(token: string, ip?: string): Promise<VerifyResponse> {
    const disable = String(env.get('DISABLE_RECAPTCHA') ?? '0') === '1'
    const isProduction = String(env.get('NODE_ENV')) === 'production'
    const secret = env.get('RECAPTCHA_SECRET_KEY')

    if (disable || (!isProduction && !secret)) {
      return { success: true }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const params = new URLSearchParams()
      params.append('secret', String(secret))
      params.append('response', token)
      if (ip) params.append('remoteip', ip)

      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      })

      const data = (await res.json()) as VerifyResponse
      return data
    } finally {
      clearTimeout(timeout)
    }
  }
}
