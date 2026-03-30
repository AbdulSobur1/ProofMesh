"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, LogOut, MenuSquare, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useProofs } from '@/lib/proof-context'
import { NotificationsResponse } from '@/lib/types'

export function TopBar() {
  const { currentUser, signOut } = useProofs()
  const pathname = usePathname()
  const identityLabel = currentUser?.displayName?.trim() || currentUser?.username
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async () => {
      if (!currentUser) {
        setUnreadCount(0)
        return
      }

      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' })
        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as NotificationsResponse
        if (!cancelled) {
          setUnreadCount(payload.unreadCount)
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0)
        }
      }
    }

    void loadNotifications()

    return () => {
      cancelled = true
    }
  }, [currentUser, pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary md:hidden">
            <MenuSquare className="size-4" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">ProofMesh App</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {currentUser ? (
            <>
              <Button variant="outline" size="sm" asChild className="relative gap-2">
                <Link href="/notifications">
                  <Bell className="size-4" />
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium">{identityLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {currentUser.currentRole || 'Signed in'}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
