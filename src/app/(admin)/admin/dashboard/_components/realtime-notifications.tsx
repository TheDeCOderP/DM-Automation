"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react"

interface NotificationItem {
  id: string
  type: "POST_PUBLISHED" | "POST_FAILED" | "ACCOUNT_DISCONNECTED" | "POST_SCHEDULED" | string
  title: string
  message: string
  createdAt: string
  read: boolean
}

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications?limit=10&offset=0")
      if (!res.ok) throw new Error("Failed to load notifications")
      const json = await res.json()
      setNotifications(json.data as NotificationItem[])
    } catch (e) {
      console.error("Error fetching notifications:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30000)
    return () => clearInterval(id)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "POST_PUBLISHED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "POST_FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "ACCOUNT_DISCONNECTED":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "POST_SCHEDULED":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const now = new Date()
    const ts = new Date(timestamp)
    const diff = now.getTime() - ts.getTime()
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  const markAllAsRead = async () => {
    // naive client-side mark all; could be optimized with API if needed
    for (const n of notifications.filter((x) => !x.read)) {
      await markAsRead(n.id)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={loading}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 ${!notification.read ? "bg-muted/20" : ""}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-card-foreground truncate">{notification.title}</p>
                      {!notification.read && <div className="w-2 h-2 bg-primary rounded-full ml-2"></div>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(notification.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}