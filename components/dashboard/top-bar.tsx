"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckSquare, LogOut, Menu, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { buildSidebarLinks } from '@/components/sidebar'
import { useProofs } from '@/lib/proof-context'
import { NotificationsResponse } from '@/lib/types'

export function TopBar() {
  const { currentUser, signOut } = useProofs()
  const pathname = usePathname()
  const identityLabel = currentUser?.displayName?.trim() || currentUser?.username
  const [unreadCount, setUnreadCount] = useState(0)
  const links = buildSidebarLinks(currentUser)

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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
              <SheetHeader className="border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <CheckSquare className="size-5" />
                  </div>
                  <div>
                    <SheetTitle>ProofMesh</SheetTitle>
                    <SheetDescription>Navigation and account</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

                    return (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }`}
                        >
                          <Icon className="size-4" />
                          <span>{link.label}</span>
                        </Link>
                      </SheetClose>
                    )
                  })}
                </nav>
              </div>

              <SheetFooter className="border-t border-border/60">
                {currentUser ? (
                  <>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-left">
                      <p className="text-sm font-medium text-foreground">{identityLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{currentUser.currentRole || currentUser.username}</p>
                    </div>
                    <Button variant="outline" onClick={signOut} className="gap-2">
                      <LogOut className="size-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" asChild>
                        <Link href="/login">Log in</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild>
                        <Link href="/signup">Sign up</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
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
