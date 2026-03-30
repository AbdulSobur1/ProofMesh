'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, Lock, ShieldCheck, Sparkles, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react'
import { useProofs } from '@/lib/proof-context'

type SignupPhase = 'email' | 'verify' | 'done'

async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function SignupPage() {
  const router = useRouter()
  const { currentUser, isLoading: isSessionLoading } = useProofs()
  const [phase, setPhase] = useState<SignupPhase>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  useEffect(() => {
    if (!isSessionLoading && currentUser) {
      router.replace('/dashboard')
    }
  }, [currentUser, isSessionLoading, router])

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
        body: JSON.stringify({ email: normalizedEmail, purpose: 'signup' }),
      })

      const data = await safeJson<{ error?: string; devCode?: string }>(response)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send verification code')
      }

      setPhase('verify')
      setSuccess('Verification code sent. Check your inbox.')
      setDevCode(data?.devCode ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSignup = async () => {
    const normalizedEmail = email.trim()
    if (!code.trim()) {
      setError('Please enter the verification code')
      return
    }
    if (!password) {
      setError('Please create a password')
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
      const response = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code: code.trim(),
          password,
          confirmPassword,
          purpose: 'signup',
        }),
      })

      const data = await safeJson<{ error?: string }>(response)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to verify code')
      }

      const authResult = await signIn('credentials', {
        identifier: normalizedEmail,
        code: code.trim(),
        redirect: false,
      })

      if (authResult?.error) {
        throw new Error(authResult.error)
      }

      setPhase('done')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const startOAuth = async (provider: 'google' | 'apple') => {
    setProviderLoading(provider)
    setError(null)
    setSuccess(null)
    await signIn(provider, { callbackUrl: '/dashboard' })
    setProviderLoading(null)
  }

  const googleReady = availableProviders.google ?? true
  const appleReady = availableProviders.apple ?? true

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%)]" />
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between border-r border-border/60 p-10 lg:flex">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to landing
          </Link>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              ProofMesh
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Build a reputation profile that feels verified.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Create your account with email verification, then use AI-backed proof submissions to grow your public skill profile.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Card className="rounded-2xl border-border/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure signup
              </div>
              <p className="mt-2 text-muted-foreground">Verification codes protect each new account.</p>
            </Card>
            <Card className="rounded-2xl border-border/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Instant access
              </div>
              <p className="mt-2 text-muted-foreground">Finish signup and move straight into the dashboard.</p>
            </Card>
          </div>
        </section>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-xl">
            <Card className="rounded-[28px] border-border/60 bg-card/90 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.35)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <p className="text-sm font-medium text-muted-foreground">Create account</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Sign up with email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a verification code sent to your inbox, then create your password.
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
                    Development only. Enter this code to finish signup.
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
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              ) : null}

              {phase === 'verify' ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Verification code</label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter the code sent to your email"
                      className="h-12 rounded-2xl tracking-[0.25em]"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
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

                  <Button className="h-12 w-full rounded-2xl" onClick={handleCompleteSignup} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Create account
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
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Account created</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Redirecting you into ProofMesh...</p>
                </div>
              ) : null}
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

