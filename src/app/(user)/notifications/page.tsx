"use client"
import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Filter,
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Archive,
  Star,
  CheckCircle2,
  XCircle,
  Calendar,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Notification } from "@prisma/client"
import { format } from "date-fns"

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch(() => null)

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

export default function NotificationsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])

  const { data: notifications, mutate } = useSWR("/api/notifications", fetcher)

  const allNotifications = useMemo(() => notifications?.data || [], [notifications]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((notification: Notification) => {
      // Search filter
      if (searchQuery && !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Status filter
      if (filter === "unread") return !notification.read
      if (filter === "read") return notification.read
      if (filter !== "all") return notification.type === filter
      return true
    })
  }, [allNotifications, filter, searchQuery])

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage)

  const unreadCount = allNotifications.filter((n: Notification) => !n.read).length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(paginatedNotifications.map((n: Notification) => n.id))
    } else {
      setSelectedNotifications([])
    }
  }

  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications((prev) => [...prev, id])
    } else {
      setSelectedNotifications((prev) => prev.filter((nId) => nId !== id))
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
      mutate()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const getNotificationIcon = (type: string, isRead: boolean) => {
    const iconClass = `h-5 w-5 ${isRead ? "opacity-60" : ""}`

    switch (type) {
      case "post_published":
        return <CheckCircle2 className={`${iconClass} text-emerald-500`} />
      case "post_failed":
        return <XCircle className={`${iconClass} text-red-500`} />
      case "post_scheduled":
        return <Calendar className={`${iconClass} text-blue-500`} />
      case "account_disconnected":
        return <AlertCircle className={`${iconClass} text-amber-500`} />
      default:
        return <Bell className={`${iconClass} text-slate-500`} />
    }
  }

  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const getPaginationRange = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  return (
    <div className="min-h-screen">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <Bell className="h-8 w-8 text-primary" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-muted-foreground text-lg">Stay updated with your latest activity</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                    {filter !== "all" && (
                      <Badge
                        variant="secondary"
                        className="ml-1 px-2 py-0.5 text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {formatNotificationType(filter)}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={filter === "all"}
                    onCheckedChange={() => {
                      setFilter("all")
                      setCurrentPage(1)
                    }}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    All notifications
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filter === "unread"}
                    onCheckedChange={() => {
                      setFilter("unread")
                      setCurrentPage(1)
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Unread only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filter === "read"}
                    onCheckedChange={() => {
                      setFilter("read")
                      setCurrentPage(1)
                    }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Read only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filter === "post_published"}
                    onCheckedChange={() => {
                      setFilter("post_published")
                      setCurrentPage(1)
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    Post published
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filter === "post_failed"}
                    onCheckedChange={() => {
                      setFilter("post_failed")
                      setCurrentPage(1)
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    Post failed
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filter === "post_scheduled"}
                    onCheckedChange={() => {
                      setFilter("post_scheduled")
                      setCurrentPage(1)
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                    Post scheduled
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filter === "account_disconnected"}
                    onCheckedChange={() => {
                      setFilter("account_disconnected")
                      setCurrentPage(1)
                    }}
                  >
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                    Account disconnected
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleMarkAllAsRead}
                  className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    selectedNotifications.length === paginatedNotifications.length && paginatedNotifications.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedNotifications.length > 0
                    ? `${selectedNotifications.length} selected`
                    : `${filteredNotifications.length} ${filter === "all" ? "total" : filter} notifications`}
                </span>
              </div>

              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <CheckCheck className="h-4 w-4" />
                    Mark read
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 bg-transparent">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number.parseInt(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {paginatedNotifications.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center">
                  <Bell className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <Search className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No notifications found</h3>
              <p className="text-muted-foreground max-w-md">
                {searchQuery
                  ? `No notifications match "${searchQuery}". Try adjusting your search or filter.`
                  : filter === "all"
                    ? "You're all caught up! No notifications to show."
                    : `No ${filter} notifications found. Try adjusting your filter.`}
              </p>
              {(searchQuery || filter !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4 bg-transparent"
                  onClick={() => {
                    setSearchQuery("")
                    setFilter("all")
                    setCurrentPage(1)
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {paginatedNotifications.map((notification: Notification) => (
              <Card
                key={notification.id}
                className={`group transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${
                  !notification.read
                    ? "ring-2 ring-primary/10 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-white dark:from-primary/5 dark:via-slate-800 dark:to-slate-800"
                    : "hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                      className="mt-1"
                    />

                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type, notification.read)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p
                          className={`text-sm leading-relaxed ${
                            !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Mark as read
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Star className="mr-2 h-4 w-4" />
                                Star
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-1 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        >
                          {formatNotificationType(notification.type)}
                        </Badge>
                        <span>•</span>
                        <time dateTime={format(notification.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx')} className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-medium text-foreground">
                {Math.min(startIndex + itemsPerPage, filteredNotifications.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{filteredNotifications.length}</span> notifications
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                First
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {getPaginationRange().map((pageNum, index) =>
                  pageNum === "..." ? (
                    <span key={`dots-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum as number)}
                    >
                      {pageNum}
                    </Button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="gap-2"
              >
                Last
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
    </div>
  )
}
