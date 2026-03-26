'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, ShieldCheck, Sparkles, ArrowRight, ChevronLeft } from 'lucide-react'

type LoginPhase = 'email' | 'code'

async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<LoginPhase>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [providerLoading, setProviderLoading] = useState<'google' | 'apple' | null>(null)
  const [availableProviders, setAvailableProviders] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers')
        const data = (await response.json()) as Record<string, unknown>
        setAvailableProviders({
          google: Boolean(data.google),
          apple: Boolean(data.apple),
        })
      } catch {
        setAvailableProviders({})
      }
    }
    loadProviders()
  }, [])

  const startOAuth = async (provider: 'google' | 'apple') => {
    setProviderLoading(provider)
    setError(null)
    setSuccess(null)
    await signIn(provider, { callbackUrl: '/dashboard' })
    setProviderLoading(null)
  }

  const handleSendCode = async () => {
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
        body: JSON.stringify({ email: normalizedEmail, purpose: 'login' }),
      })

      const data = await safeJson<{ error?: string; devCode?: string }>(response)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send verification code')
      }

      setPhase('code')
      setSuccess('Verification code sent. Check your inbox.')
      setDevCode(data?.devCode ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim()
    if (!code.trim()) {
      setError('Please enter the verification code')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await signIn('credentials', {
        identifier: normalizedEmail,
        code: code.trim(),
        redirect: false,
      })

      if (response?.error) {
        throw new Error(response.error)
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const googleReady = availableProviders.google ?? true
  const appleReady = availableProviders.apple ?? true

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%)]" />
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden flex-col justify-between border-r border-border/60 p-10 lg:flex">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to landing
          </Link>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Welcome back
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Sign in to continue building your reputation.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Use Google, Apple, or a secure email code to access your dashboard and proof profile.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Card className="rounded-2xl border-border/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Protected access
              </div>
              <p className="mt-2 text-muted-foreground">Your dashboard stays behind sign-in only routes.</p>
            </Card>
            <Card className="rounded-2xl border-border/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Mail className="h-4 w-4 text-emerald-500" />
                Email codes
              </div>
              <p className="mt-2 text-muted-foreground">Inbox verification makes login quick and secure.</p>
            </Card>
          </div>
        </section>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-xl">
            <Card className="rounded-[28px] border-border/60 bg-card/90 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.35)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Log in</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a provider or sign in with a verification code sent to your email.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-center rounded-2xl"
                  onClick={() => startOAuth('google')}
                  disabled={loading || providerLoading !== null || !googleReady}
                >
                  {providerLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-center rounded-2xl"
                  onClick={() => startOAuth('apple')}
                  disabled={loading || providerLoading !== null || !appleReady}
                >
                  {providerLoading === 'apple' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue with Apple
                </Button>
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or use email</span>
                <div className="h-px flex-1 bg-border/70" />
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
                    Development only. Enter this code to sign in.
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

                  <Button className="h-12 w-full rounded-2xl" onClick={handleSendCode} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Send verification code
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="font-medium text-primary hover:underline">
                      Create one
                    </Link>
                  </p>
                </div>
              ) : null}

              {phase === 'code' ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Verification code</label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter the code from your inbox"
                      className="h-12 rounded-2xl tracking-[0.25em]"
                      disabled={loading}
                    />
                  </div>

                  <Button className="h-12 w-full rounded-2xl" onClick={handleLogin} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Sign in
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
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
