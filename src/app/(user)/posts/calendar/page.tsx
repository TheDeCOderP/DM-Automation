'use client'
import { useState, useRef } from "react"
import useSWR from "swr"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { TooltipProvider } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { type Post, Media, Platform } from "@prisma/client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { PostPreviewModal } from "@/components/modals/PostPreviewModal"

import { Status } from "@prisma/client";
import { getPlatformIcon } from "@/utils/ui/icons";
import type { VariantProps } from "class-variance-authority";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core/index.js"

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
    socialAccounts?: {
      platformUsername: string
    }[]
    avatarUrl?: string
  }
  name?: string
  socialAccounts?: {
    platformUsername: string
  }[]
  platformUsername?: string
  avatarUrl?: string
}

export default function CalendarUI() {
  const { data, isLoading } = useSWR("/api/posts?limit=1000", fetcher); // Get all posts for calendar view

  const [hoveredPost, setHoveredPost] = useState<HoveredPost | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>(null)

  const handleDateClick = (arg: DateClickArg) => {
    console.log("Date clicked:", arg.dateStr)
  }

  const handleEventClick = (info: EventClickArg) => {
    console.log("Event clicked:", info.event)
  }

  const calculateModalPosition = (mouseX: number, mouseY: number, modalWidth: number, modalHeight: number) => {
    const padding = 20
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = mouseX + 15
    let y = mouseY - modalHeight / 2

    if (x + modalWidth + padding > viewportWidth) {
      x = mouseX - modalWidth - 15
    }

    if (x < padding) {
      x = padding
    }

    if (y + modalHeight + padding > viewportHeight) {
      y = viewportHeight - modalHeight - padding
    }

    if (y < padding) {
      y = padding
    }

    return { x, y }
  }

  const handleEventMouseEnter = (info: EventContentArg, event: MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const platform = info.event.extendedProps.platform as Platform
    const content = info.event.extendedProps.content
    const author = info.event.extendedProps.author
    const image = info.event.extendedProps.image

    const modalWidth = platform === "INSTAGRAM" ? 400 : 500
    const modalHeight = image ? 600 : 400

    const position = calculateModalPosition(event.clientX, event.clientY, modalWidth, modalHeight)

    setHoveredPost({
      post: {
        url: info.event.url,
        content,
        author: {
          name: author?.name || "Unknown User",
          username: author?.username || "unknown",
          avatar: author?.avatar || "/placeholder.svg",
          verified: Math.random() > 0.7,
          title: author?.title || "Content Creator",
        },
        image,
        timestamp: new Date(info.event.start ?? ""),
        engagement: {
          likes: Math.floor(Math.random() * 500) + 50,
          comments: Math.floor(Math.random() * 50) + 5,
          shares: Math.floor(Math.random() * 20) + 2,
          retweets: Math.floor(Math.random() * 30) + 3,
        },
      },
      platform,
      position,
    })
  }

  const handleEventMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPost(null)
    }, 150)
  }

  const getUserData = (post: PostWithUser) => {
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

  return (
    <div className="relative">
      <TooltipProvider>
        <Card className="h-full border-0 shadow-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                height="auto"
                nowIndicator={true}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={3}
                events={data?.posts?.map((post: PostWithUser) => {
                  const userData = getUserData(post)

                  return {
                    id: post.id,
                    url: post.url,
                    title: post.content?.substring(0, 20) + (post.content?.length > 20 ? "..." : ""),
                    platform: post.platform,
                    start: post.scheduledAt,
                    end: post.scheduledAt,
                    extendedProps: {
                      status: post.status,
                      content: post.content,
                      image: post?.media && post.media.length > 0 ? post.media[0].url : null,
                      author: userData,
                    },
                    backgroundColor: getEventColor(post.platform),
                    borderColor: 'transparent',
                  }
                })}
                eventContent={(eventInfo) =>
                  renderEventContent(eventInfo, handleEventMouseEnter, handleEventMouseLeave)
                }
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventClassNames="cursor-pointer"
              />
            )}
          </CardContent>
        </Card>

        {hoveredPost && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${hoveredPost.position.x}px`,
              top: `${hoveredPost.position.y}px`,
            }}
          >
            <PostPreviewModal post={hoveredPost.post} platform={hoveredPost.platform} />
          </div>
        )}
      </TooltipProvider>
    </div>
  )
}

function getEventColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    [Platform.FACEBOOK]: "#1877F2",
    [Platform.INSTAGRAM]: "#E1306C",
    [Platform.TWITTER]: "#1DA1F2",
    [Platform.LINKEDIN]: "#0A66C2",
    [Platform.ALL]: "#6B7280",
    [Platform.GOOGLE]: "#4285F4",
    [Platform.MEDUIM]: "#000000",
    [Platform.PINTEREST]: "#E60023",
    [Platform.QUORA]: "#B92B27",
    [Platform.REDDIT]: "#FF4500",
  }
  return colors[platform] || "#6B7280"
}

function renderEventContent(
  eventInfo: EventContentArg,
  onMouseEnter: (info: EventContentArg, event: MouseEvent) => void,
  onMouseLeave: () => void,
) {
  const platform = eventInfo.event.extendedProps.platform as Platform
  const status = eventInfo.event.extendedProps.status as Status
  const PlatformIcon = getPlatformIcon(platform)

  const statusVariantMap = {
    [Status.PUBLISHED]: "success",
    [Status.FAILED]: "destructive",
    [Status.SCHEDULED]: "secondary",
    [Status.DRAFTED]: "outline",
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-1 w-full cursor-pointer",
        "border-l-4 rounded-sm",
        status === Status.PUBLISHED && "border-l-green-500 bg-green-50",
        status === Status.FAILED && "border-l-red-500 bg-red-50",
        status === Status.SCHEDULED && "border-l-blue-500 bg-blue-50",
        status === Status.DRAFTED && "border-l-gray-500 bg-gray-50",
        "hover:bg-accent transition-colors",
      )}
      onMouseEnter={(e) => onMouseEnter(eventInfo, e.nativeEvent)}
      onMouseLeave={onMouseLeave}
    >
      {PlatformIcon}
      <Badge variant={statusVariantMap[status] as VariantProps<typeof Badge>["variant"]} className="h-5 px-1.5 text-xs">
        {status.substring(0, 3)}
      </Badge>
      <span className="text-xs text-muted-foreground ml-auto">{eventInfo.timeText}</span>
    </div>
  )
}