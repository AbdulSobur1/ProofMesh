"use client"

import Link from 'next/link'
import { LogOut, MenuSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProofs } from '@/lib/proof-context'

export function TopBar() {
  const { currentUser, signOut } = useProofs()

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
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium">{currentUser.username}</div>
                <div className="text-xs text-muted-foreground">Signed in</div>
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
