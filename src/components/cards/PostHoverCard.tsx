"use client"

import type React from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Building2, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { formatDate, formatDateTime } from "@/utils/format"

interface ApiPost {
  id: string
  userId: string
  content: string
  platform: "FACEBOOK" | "TWITTER" | "INSTAGRAM" | "LINKEDIN"
  publishedAt: string | null
  scheduledAt: string | null
  frequency: string
  status: "DRAFTED" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  createdAt: string
  updatedAt: string
  brandId: string
  socialAccountPageId: string | null
  media: Array<{
    id: string
    url: string
    type: string
  }>
  brand: {
    id: string
    name: string
    description: string
    logo: string
    website: string
    deleted: boolean
    createdAt: string
    updatedAt: string
  }
  socialAccountPage: string | null
  user: {
    name: string
    email: string
    image: string
  }
}

interface PostHoverCardProps {
  children: React.ReactNode
  post: ApiPost
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case "FAILED":
      return <XCircle className="w-4 h-4 text-destructive" />
    case "SCHEDULED":
      return <Clock className="w-4 h-4 text-primary" />
    case "DRAFTED":
      return <AlertCircle className="w-4 h-4 text-yellow-600" />
    default:
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />
  }
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "PUBLISHED":
      return "default"
    case "FAILED":
      return "destructive"
    case "SCHEDULED":
      return "secondary"
    case "DRAFTED":
      return "outline"
    default:
      return "outline"
  }
}

export function PostHoverCard({ children, post }: PostHoverCardProps) {
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" align="center">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Post Details</h4>
            <Badge variant={getStatusVariant(post.status)} className="flex items-center gap-1">
              {getStatusIcon(post.status)}
              {post.status}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{post.brand.name}</span>
            </div>
            {post.scheduledAt && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Scheduled: {formatDateTime(post.scheduledAt)}
                </span>
              </div>
            )}
            {post.publishedAt && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Published: {formatDateTime(post.publishedAt)}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Created: {formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
