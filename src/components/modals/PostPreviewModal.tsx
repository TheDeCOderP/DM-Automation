"use client"
import { FacebookEmbed, XEmbed } from 'react-social-media-embed';

import TwitterPreview from "../cards/TwitterPreview";
import FacebookPreview from "../cards/FacebookPreview";
import LinkedInPreview from "../cards/LinkedInPreview";
import InstagramPreview from "../cards/InstagramPreview";

import { Platform } from "@prisma/client";

interface PostData {
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
        if(post.url) {
          return <FacebookEmbed url={post.url} />
        } else {
          return <FacebookPreview post={post} />
        }
      case "TWITTER":
        if(post.url) {
          return <XEmbed url={post.url} />
        } else {
          return <TwitterPreview  post={post} />
        }
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
