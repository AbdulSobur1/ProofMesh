'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BriefcaseBusiness, CheckCheck, Mail, MessageCircle, MessageSquareQuote, Settings2, UserPlus } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NotificationRecord, NotificationSettings, NotificationSettingsResponse, NotificationsResponse, NotificationType } from '@/lib/types'

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
  post_reposted: MessageCircle,
  job_application_submitted: BriefcaseBusiness,
  job_application_status: BriefcaseBusiness,
} as const

const notificationTypeOptions: Array<{ value: 'all' | NotificationType; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'message_received', label: 'Messages' },
  { value: 'endorsement_requested', label: 'Requests' },
  { value: 'connection_request', label: 'Connections' },
  { value: 'post_commented', label: 'Social' },
  { value: 'job_application_status', label: 'Hiring' },
]

const defaultSettings: NotificationSettings = {
  connections: true,
  messages: true,
  endorsements: true,
  social: true,
  jobs: true,
  dailyDigest: false,
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (typeFilter !== 'all') {
        params.set('type', typeFilter)
      }

      const [notificationsResponse, settingsResponse] = await Promise.all([
        fetch(`/api/notifications${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' }),
        fetch('/api/notifications/settings', { cache: 'no-store' }),
      ])

      if (!notificationsResponse.ok) {
        throw new Error('Failed to load notifications')
      }
      if (!settingsResponse.ok) {
        throw new Error('Failed to load notification settings')
      }

      const payload = (await notificationsResponse.json()) as NotificationsResponse
      const settingsPayload = (await settingsResponse.json()) as NotificationSettingsResponse
      setNotifications(payload.notifications)
      setUnreadCount(payload.unreadCount)
      setSettings(settingsPayload.settings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    void load()
  }, [load])

  const visibleUnreadIds = notifications.filter((notification) => !notification.readAt).map((notification) => notification.id)

  const markAllRead = async () => {
    setIsMarkingAll(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: visibleUnreadIds }),
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
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId && !notification.readAt
            ? {
                ...notification,
                readAt: new Date().toISOString(),
              }
            : notification
        )
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to update notification')
    } finally {
      setMarkingId(null)
    }
  }

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.link) return

    if (!notification.readAt) {
      await markOneRead(notification.id)
    }

    router.push(notification.link)
  }

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const nextSettings = { ...settings, [key]: value }
    setSettings(nextSettings)
    setIsSavingSettings(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextSettings),
      })
      const payload = (await response.json().catch(() => null)) as NotificationSettingsResponse | { error?: string } | null
      if (!response.ok) {
        throw new Error(payload && 'error' in payload ? payload.error ?? 'Failed to update settings' : 'Failed to update settings')
      }
      setSettings((payload as NotificationSettingsResponse).settings)
    } catch (settingsError) {
      setSettings(settings)
      setError(settingsError instanceof Error ? settingsError.message : 'Failed to update settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 md:ml-72 md:pb-0">
        <TopBar />

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-5 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-14">
                  <Bell className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Notifications</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Stay on top of the signals that matter.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Likes, comments, messages, connections, and hiring activity now come back to one place so ProofMesh feels alive instead of passive.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : `${unreadCount} unread`}
                </Badge>
                <Button variant="outline" onClick={markAllRead} disabled={isMarkingAll || visibleUnreadIds.length === 0} className="w-full sm:w-auto">
                  <CheckCheck className="size-4" />
                  Mark visible read
                </Button>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <Card className="mb-6 rounded-[2rem] border border-border/60 p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                    <div className="flex flex-wrap gap-2">
                    {(['all', 'unread', 'read'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}
                      </Button>
                    ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Type</p>
                    <div className="flex flex-wrap gap-2">
                    {notificationTypeOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={typeFilter === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTypeFilter(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                    </div>
                  </div>
                </div>
              </Card>

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full rounded-[2rem]" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                  No notifications match this view yet. Try a different filter or wait for new activity.
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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                            {notification.link ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => void openNotification(notification)}
                              >
                                Open
                              </Button>
                            ) : null}
                            {isUnread ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markOneRead(notification.id)}
                                disabled={markingId === notification.id}
                                className="w-full sm:w-auto"
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
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2rem] border border-border/60 p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="size-4 text-primary" />
                  Notification settings
                </div>
                <div className="mt-4 space-y-4">
                  {([
                    ['connections', 'Connection requests and accepts'],
                    ['messages', 'Inbox messages and replies'],
                    ['endorsements', 'Proof verification requests'],
                    ['social', 'Likes, comments, and reposts'],
                    ['jobs', 'Application and hiring updates'],
                    ['dailyDigest', 'Daily summary digest'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 p-3">
                      <Label htmlFor={key} className="text-sm leading-5 text-foreground">
                        {label}
                      </Label>
                      <Checkbox
                        id={key}
                        checked={settings[key]}
                        onCheckedChange={(checked) => void updateSetting(key, checked === true)}
                        disabled={isSavingSettings}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  These settings control which new notifications get created for your account.
                </p>
              </Card>

              <Card className="rounded-[2rem] border border-border/60 p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Bell className="size-4 text-primary" />
                  Inbox state
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>{unreadCount} unread across your account.</p>
                  <p>{visibleUnreadIds.length} unread in the current filtered view.</p>
                  <p>Open actions mark items read so the inbox behaves more like a real activity queue.</p>
                </div>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
