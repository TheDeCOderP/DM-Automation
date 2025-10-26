"use client"

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useState, useRef, useMemo } from "react";
import {
  CalendarProvider,
  CalendarHeader,
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarMonthPicker,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
  monthsForLocale,
  CalendarState,
  Feature
} from "@/components/ui/shadcn-io/calendar"

import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { type Post, Media, Platform, Status } from "@prisma/client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { PostPreviewModal } from "@/components/modals/PostPreviewModal"
import { getPlatformIcon } from "@/utils/ui/icons"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface HoveredPost {
  post: {
    url: string | undefined
    content: string
    author: {
      name: string
      username: string
      avatar: string
      verified?: boolean
      title?: string
    }
    image?: string
    timestamp: Date
    engagement?: {
      likes: number
      comments: number
      shares?: number
      retweets?: number
    }
  }
  platform: Platform
  position: { x: number; y: number }
}

interface PostWithUser extends Post {
  platform: Platform
  status: Status
  media: Media[]
  user: {
    name: string
    socialAccounts?: { platformUsername: string }[]
    avatarUrl?: string
  }
  name?: string
  socialAccounts?: { platformUsername: string }[]
  platformUsername?: string
  avatarUrl?: string
}

interface PostFeature extends Feature {
  post: PostWithUser
}

export default function CalendarUI() {
  const router = useRouter();
  const { data, isLoading } = useSWR("/api/posts?limit=1000", fetcher)
  const [hoveredPost, setHoveredPost] = useState<HoveredPost | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>(null)

  const handleEventMouseEnter = (post: PostWithUser, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

    const userData = getUserData(post)
    const modalWidth = post.platform === "INSTAGRAM" ? 400 : 500
    const modalHeight = post.media?.length ? 600 : 400
    const position = calculateModalPosition(e.clientX, e.clientY, modalWidth, modalHeight)

    setHoveredPost({
      post: {
        url: post.url || undefined,
        content: post.content,
        author: {
          name: userData.name,
          username: userData.username,
          avatar: userData.avatar,
          verified: Math.random() > 0.7,
          title: "Content Creator",
        },
        image: post.media?.[0]?.url ?? undefined,
        timestamp: new Date(post.scheduledAt ?? ""),
        engagement: {
          likes: Math.floor(Math.random() * 500) + 50,
          comments: Math.floor(Math.random() * 50) + 5,
          shares: Math.floor(Math.random() * 20) + 2,
          retweets: Math.floor(Math.random() * 30) + 3,
        },
      },
      platform: post.platform,
      position,
    })
  }

  const handleEventMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredPost(null), 150)
  }

  return (
    <div className="relative">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-2">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Calendar
          </h1>
          <p className="text-muted-foreground text-lg">View your posts on the calendar</p>
        </div>
      </div>

      <TooltipProvider>
        <Card className="h-full border-0 shadow-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : (
              <CalendarProvider>
                {/* === Navigation row (month label + controls) === */}
                <TitleBar />

                {/* Weekday header */}
                <CalendarHeader />

                {/* Month grid */}
                <CalendarBody
                  features={data?.posts?.map((post: PostWithUser) => ({
                    id: post.id,
                    name:
                      post.content?.substring(0, 20) +
                      (post.content?.length > 20 ? "..." : ""),
                    startAt: new Date(post.scheduledAt ?? new Date()),
                    endAt: new Date(post.scheduledAt ?? new Date()),
                    status: {
                      id: post.status,
                      name: post.status,
                      color: getEventColor(post.platform),
                    },
                    post,
                  }))}
                >
                  {({ feature }) => {
                    const postFeature = feature as PostFeature
                    const post = postFeature.post as PostWithUser
                    const PlatformIcon = getPlatformIcon(post.platform)
                    return (
                      <button
                        key={feature.id}
                        onMouseEnter={(e) => handleEventMouseEnter(post, e)}
                        onMouseLeave={handleEventMouseLeave}
                        onClick={() => router.push(`/posts/${post.id}`)}
                        className={cn(
                          "flex items-center gap-2 p-1 cursor-pointer rounded-sm",
                          "hover:bg-accent transition-colors",
                        )}
                      >
                        {PlatformIcon}
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {post.status.substring(0, 3)}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {feature.startAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    )
                  }}
                </CalendarBody>
              </CalendarProvider>
            )}
          </CardContent>
        </Card>

        {/* Hover modal */}
        {hoveredPost && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: hoveredPost.position.x, top: hoveredPost.position.y }}
          >
            <PostPreviewModal post={hoveredPost.post} platform={hoveredPost.platform} />
          </div>
        )}
      </TooltipProvider>
    </div>
  )
}

/** --- Helpers --- */

function TitleBar() {
  const [month, setMonth] = useCalendarMonth()
  const [year, setYear] = useCalendarYear()

  const monthName = useMemo(() => monthsForLocale("en-US")[month], [month])

  const goToToday = () => {
    const now = new Date()
    setMonth(now.getMonth() as CalendarState["month"])
    setYear(now.getFullYear())
  }

  return (
    <CalendarDate>
      <div className="font-semibold hidden md:block">{monthName} {year}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <CalendarDatePagination />
        <Button onClick={goToToday} size="sm" variant="outline">
          Today
        </Button>
        <CalendarMonthPicker />
        <CalendarYearPicker start={2000} end={2100} />
      </div>
    </CalendarDate>
  )
}

function getUserData(post: PostWithUser) {
  const name = post.user?.name || post.name || "Unknown User"
  const avatar = post.user?.avatarUrl || post.avatarUrl || "/placeholder.svg"

  let username = "unknown"
  if (post.user?.socialAccounts?.[0]?.platformUsername) {
    username = post.user.socialAccounts[0].platformUsername
  } else if (post.socialAccounts?.[0]?.platformUsername) {
    username = post.socialAccounts[0].platformUsername
  } else if (post.platformUsername) {
    username = post.platformUsername
  }

  return { name, username, avatar }
}

function calculateModalPosition(mouseX: number, mouseY: number, modalWidth: number, modalHeight: number) {
  const padding = 20
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = mouseX + 15
  let y = mouseY - modalHeight / 2

  if (x + modalWidth + padding > viewportWidth) x = mouseX - modalWidth - 15
  if (x < padding) x = padding
  if (y + modalHeight + padding > viewportHeight) y = viewportHeight - modalHeight - padding
  if (y < padding) y = padding

  return { x, y }
}

function getEventColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    [Platform.FACEBOOK]: "#1877F2",
    [Platform.INSTAGRAM]: "#E1306C",
    [Platform.TWITTER]: "#1DA1F2",
    [Platform.LINKEDIN]: "#0A66C2",
    [Platform.ALL]: "#6B7280",
    [Platform.GOOGLE]: "#4285F4",
    [Platform.MEDIUM]: "#000000",
    [Platform.PINTEREST]: "#E60023",
    [Platform.QUORA]: "#B92B27",
    [Platform.REDDIT]: "#FF4500",
    [Platform.YOUTUBE]: "#FF0000",
    [Platform.TIKTOK]: "#000000",
    [Platform.ZOHO_WORKDRIVE]: "#FF7A00",
    [Platform.HASHNODE]: "#000000",
    [Platform.CUSTOM_API]: "#6B7280",
    [Platform.WORDPRESS]: "#21759B",
    [Platform.DEV_TO]: "#000000",
  }
  return colors[platform] || "#6B7280"
}
