"use client"

import TwitterPreview from "../cards/TwitterPreview";
import FacebookPreview from "../cards/FacebookPreview";
import LinkedInPreview from "../cards/LinkedInPreview";
import InstagramPreview from "../cards/InstagramPreview";

type Platform = "LINKEDIN" | "FACEBOOK" | "TWITTER" | "INSTAGRAM" | "ALL"

interface PostData {
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

interface PostPreviewHoverProps {
  post: PostData
  platform: Platform
}

export function PostPreviewModal({ post, platform }: PostPreviewHoverProps) {
  const renderPreview = () => {
    switch (platform) {
      case "LINKEDIN":
        return <LinkedInPreview post={post} />
      case "FACEBOOK":
        return <FacebookPreview post={post} />
      case "TWITTER":
        return <TwitterPreview  post={post} />
      case "INSTAGRAM":
        return <InstagramPreview post={post}/>
      default:
        return <LinkedInPreview post={post} />
    }
  }

  return (
    <div className="absolute z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200">
      {renderPreview()}
    </div>
  )
}
