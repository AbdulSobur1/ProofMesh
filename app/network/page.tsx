'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Mail, Users, X } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConnectionRecord, NetworkResponse } from '@/lib/types'
import { useProofs } from '@/lib/proof-context'

export default function NetworkPage() {
  const { currentUser } = useProofs()
  const [data, setData] = useState<NetworkResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingConnectionId, setActingConnectionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/network', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load your network')
      }
      const payload = (await response.json()) as NetworkResponse
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const actOnConnection = async (connectionId: string, method: 'PATCH' | 'DELETE', action?: 'accept' | 'decline' | 'cancel') => {
    setActingConnectionId(connectionId)
    setError(null)
    try {
      const response = await fetch(`/api/network/${encodeURIComponent(connectionId)}`, {
        method,
        headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PATCH' ? JSON.stringify({ action }) : undefined,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update connection')
      }

      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update connection')
    } finally {
      setActingConnectionId(null)
    }
  }

  const renderConnectionCard = (connection: ConnectionRecord, mode: 'incoming' | 'outgoing' | 'connected') => {
    const displayUser =
      mode === 'incoming'
        ? connection.requester
        : mode === 'outgoing'
          ? connection.recipient
          : connection.requester.id === currentUser?.id
            ? connection.recipient
            : connection.requester

    return (
      <Card key={connection.id} className="rounded-[2rem] border border-border/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {displayUser.displayName || displayUser.username}
              </h3>
              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                @{displayUser.username}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {displayUser.headline || [displayUser.currentRole, displayUser.currentCompany].filter(Boolean).join(' at ') || 'Proof-backed professional'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/profile/${encodeURIComponent(displayUser.username)}`}>View profile</Link>
            </Button>

            {mode === 'incoming' ? (
              <>
                <Button onClick={() => actOnConnection(connection.id, 'PATCH', 'accept')} disabled={actingConnectionId === connection.id} className="w-full sm:w-auto">
                  <Check className="size-4" />
                  Accept
                </Button>
                <Button variant="outline" onClick={() => actOnConnection(connection.id, 'PATCH', 'decline')} disabled={actingConnectionId === connection.id} className="w-full sm:w-auto">
                  <X className="size-4" />
                  Decline
                </Button>
              </>
            ) : null}

            {mode === 'outgoing' ? (
              <Button variant="outline" onClick={() => actOnConnection(connection.id, 'PATCH', 'cancel')} disabled={actingConnectionId === connection.id} className="w-full sm:w-auto">
                <X className="size-4" />
                Cancel request
              </Button>
            ) : null}

            {mode === 'connected' ? (
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/messages?user=${encodeURIComponent(displayUser.username)}`}>
                    <Mail className="size-4" />
                    Message
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => actOnConnection(connection.id, 'DELETE')} disabled={actingConnectionId === connection.id} className="w-full sm:w-auto">
                  <X className="size-4" />
                  Remove connection
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>
    )
  }

  const incomingRequests = data?.incomingRequests ?? []
  const outgoingRequests = data?.outgoingRequests ?? []
  const connections = data?.connections ?? []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 md:ml-72 md:pb-0">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-5 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-14">
                <Users className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Professional network</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Build real connections around proof-backed profiles.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This is the first social layer in ProofMesh: send requests, accept them, and start building a graph of credible professional relationships.
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-[2rem] border border-border/60 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Connections</p>
              <p className="mt-3 text-4xl font-semibold text-foreground">{isLoading ? '—' : data?.counts.totalConnections ?? 0}</p>
            </Card>
            <Card className="rounded-[2rem] border border-border/60 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Incoming requests</p>
              <p className="mt-3 text-4xl font-semibold text-foreground">{isLoading ? '—' : data?.counts.incomingRequests ?? 0}</p>
            </Card>
            <Card className="rounded-[2rem] border border-border/60 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sent requests</p>
              <p className="mt-3 text-4xl font-semibold text-foreground">{isLoading ? '—' : data?.counts.outgoingRequests ?? 0}</p>
            </Card>
          </div>

          <div className="mt-8 space-y-8">
            <section>
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Incoming requests</h2>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : incomingRequests.length}
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-[2rem]" />
              ) : incomingRequests.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                  No incoming requests yet.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {incomingRequests.map((connection) => renderConnectionCard(connection, 'incoming'))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sent requests</h2>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : outgoingRequests.length}
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-[2rem]" />
              ) : outgoingRequests.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                  No pending outgoing requests.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {outgoingRequests.map((connection) => renderConnectionCard(connection, 'outgoing'))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Connections</h2>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : connections.length}
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-[2rem]" />
              ) : connections.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                  No accepted connections yet. Visit profiles and start connecting.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {connections.map((connection) => renderConnectionCard(connection, 'connected'))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
