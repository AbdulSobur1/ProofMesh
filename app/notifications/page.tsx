'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, BriefcaseBusiness, CheckCheck, Mail, MessageCircle, MessageSquareQuote, UserPlus } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationRecord, NotificationsResponse } from '@/lib/types'

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const iconByType = {
  connection_request: UserPlus,
  connection_accepted: UserPlus,
  message_received: Mail,
  endorsement_requested: MessageSquareQuote,
  endorsement_request_completed: MessageSquareQuote,
  endorsement_request_declined: MessageSquareQuote,
  post_liked: Bell,
  post_commented: MessageCircle,
  job_application_submitted: BriefcaseBusiness,
  job_application_status: BriefcaseBusiness,
} as const

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load notifications')
      }

      const payload = (await response.json()) as NotificationsResponse
      setNotifications(payload.notifications)
      setUnreadCount(payload.unreadCount)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markAllRead = async () => {
    setIsMarkingAll(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      })
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }
      await load()
    } catch (markAllError) {
      setError(markAllError instanceof Error ? markAllError.message : 'Failed to mark notifications as read')
    } finally {
      setIsMarkingAll(false)
    }
  }

  const markOneRead = async (notificationId: string) => {
    setMarkingId(notificationId)
    setError(null)
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
        method: 'PATCH',
      })
      if (!response.ok) {
        throw new Error('Failed to update notification')
      }
      await load()
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to update notification')
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Notifications</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Stay on top of the signals that matter.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Likes, comments, messages, connections, and hiring activity now come back to one place so ProofMesh feels alive instead of passive.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : `${unreadCount} unread`}
                </Badge>
                <Button variant="outline" onClick={markAllRead} disabled={isMarkingAll || unreadCount === 0}>
                  <CheckCheck className="size-4" />
                  Mark all read
                </Button>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <section className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-[2rem]" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                No notifications yet. Once your network starts interacting, this is where the high-signal activity will show up.
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const Icon = iconByType[notification.type] ?? Bell
                  const isUnread = !notification.readAt

                  return (
                    <Card
                      key={notification.id}
                      className={`rounded-[2rem] border p-5 ${
                        isUnread ? 'border-primary/25 bg-primary/5' : 'border-border/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background/80 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-foreground">{notification.title}</h2>
                              {isUnread ? (
                                <Badge className="bg-primary text-primary-foreground">Unread</Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-foreground/80">{notification.body}</p>
                            {notification.actor ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                From {notification.actor.displayName || notification.actor.username}
                              </p>
                            ) : null}
                            <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {notification.link ? (
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={notification.link}
                                onClick={() => {
                                  if (isUnread) {
                                    void markOneRead(notification.id)
                                  }
                                }}
                              >
                                Open
                              </Link>
                            </Button>
                          ) : null}
                          {isUnread ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markOneRead(notification.id)}
                              disabled={markingId === notification.id}
                            >
                              Mark read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
