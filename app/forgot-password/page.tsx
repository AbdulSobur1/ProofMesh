'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, Lock, ArrowRight, ChevronLeft } from 'lucide-react'

type ResetPhase = 'email' | 'code' | 'done'

async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<ResetPhase>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSendResetCode = async () => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setDevCode(null)

    try {
      const response = await fetch('/api/auth/email/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, purpose: 'reset' }),
      })

      const data = await safeJson<{ error?: string; devCode?: string }>(response)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send reset code')
      }

      setPhase('code')
      setSuccess('Reset code sent. Check your inbox.')
      setDevCode(data?.devCode ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    const normalizedEmail = email.trim()
    if (!code.trim()) {
      setError('Please enter the reset code')
      return
    }
    if (!password) {
      setError('Please enter a new password')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code: code.trim(),
          password,
        }),
      })

      const data = await safeJson<{ error?: string }>(response)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reset password')
      }

      setPhase('done')
      setTimeout(() => {
        router.push('/login')
      }, 1300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%)]" />
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1fr_1fr]">
        <section className="hidden flex-col justify-between border-r border-border/60 p-10 lg:flex">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Reset your password securely.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              We&apos;ll send a verification code to your email so only the inbox owner can update the account password.
            </p>
          </div>

          <Card className="rounded-2xl border-border/60 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Inbox verified reset
            </div>
            <p className="mt-2 text-muted-foreground">Codes expire quickly and are tied to this password reset request only.</p>
          </Card>
        </section>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-xl">
            <Card className="rounded-[28px] border-border/60 bg-card/90 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.35)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <p className="text-sm font-medium text-muted-foreground">Forgot password</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Recover account access</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your email, get a reset code, then choose a new password.
                </p>
              </div>

              {error ? (
                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}

              {devCode ? (
                <div className="mb-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Dev Code</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[0.35em] text-sky-100">{devCode}</p>
                  <p className="mt-2 text-xs text-sky-200/80">
                    Development only. Use this code to reset your password.
                  </p>
                </div>
              ) : null}

              {phase === 'email' ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Email address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="h-12 rounded-2xl pl-11"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button className="h-12 w-full rounded-2xl" onClick={handleSendResetCode} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Send reset code
                  </Button>
                </div>
              ) : null}

              {phase === 'code' ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Reset code</label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter code from your inbox"
                      className="h-12 rounded-2xl tracking-[0.25em]"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">New password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="New password"
                          className="h-12 rounded-2xl pl-11"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Confirm password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className="h-12 rounded-2xl pl-11"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <Button className="h-12 w-full rounded-2xl" onClick={handleReset} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Reset password
                  </Button>

                  <button
                    type="button"
                    onClick={() => setPhase('email')}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    Use a different email
                  </button>
                </div>
              ) : null}

              {phase === 'done' ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <Mail className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Password updated</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Redirecting you back to sign in...</p>
                </div>
              ) : null}
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
