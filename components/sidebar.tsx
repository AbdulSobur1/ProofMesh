"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Bell, BookmarkCheck, BriefcaseBusiness, Building2, CheckSquare, Compass, Mail, Newspaper, Plus, Search, ShieldAlert, Target, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProofs } from '@/lib/proof-context'

export function Sidebar() {
  const pathname = usePathname()
  const { currentUser } = useProofs()
  const profileHref = currentUser ? `/profile/${encodeURIComponent(currentUser.username)}` : '/login'

  const links = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      href: '/discover',
      label: 'Discover Talent',
      icon: Compass,
    },
    {
      href: '/search',
      label: 'Search',
      icon: Search,
    },
    {
      href: '/discover/saved',
      label: 'Saved Candidates',
      icon: BookmarkCheck,
    },
    {
      href: '/discover/match',
      label: 'Role Matching',
      icon: Target,
    },
    {
      href: '/discover/jobs',
      label: 'Recruiter Jobs',
      icon: BriefcaseBusiness,
    },
    {
      href: '/submit',
      label: 'Submit Proof',
      icon: Plus,
    },
    {
      href: '/network',
      label: 'Network',
      icon: Users,
    },
    {
      href: '/messages',
      label: 'Messages',
      icon: Mail,
    },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      href: '/jobs',
      label: 'Jobs Board',
      icon: BriefcaseBusiness,
    },
    {
      href: '/company',
      label: 'Company',
      icon: Building2,
    },
    {
      href: '/feed',
      label: 'Feed',
      icon: Newspaper,
    },
    {
      href: profileHref,
      label: 'Profile',
      icon: User,
    },
  ]

  if (currentUser?.isAdmin) {
    links.push({
      href: '/admin/moderation',
      label: 'Moderation',
      icon: ShieldAlert,
    })
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-border/60 bg-sidebar/90 backdrop-blur md:flex">
      <div className="border-b border-border/60 p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CheckSquare className="size-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-foreground">ProofMesh</div>
            <div className="text-xs text-muted-foreground">Build proof, earn trust</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          <p className="mt-2 text-sm text-foreground/80">Discovery, shortlist, role matching, and custom job workflows are now live.</p>
        </div>
      </div>
    </aside>
  )
}
