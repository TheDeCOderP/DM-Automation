"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Repeat2, ThumbsUp, Send, Bookmark, Share, MoreHorizontal, Verified } from "lucide-react"
import Image from "next/image"

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
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "now"
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return `${Math.floor(diffInHours / 168)}w`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const LinkedInPreview = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-[500px] shadow-xl transition-all duration-200 hover:shadow-2xl">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12 ring-2 ring-blue-100">
            <AvatarImage src={post.author.avatar || "/placeholder.svg?height=48&width=48"} />
            <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-700">
              {post.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h3 className="font-semibold text-gray-900 text-base hover:text-blue-700 cursor-pointer hover:underline">
                {post.author.name}
              </h3>
              {post.author.verified && <Verified className="w-4 h-4 text-blue-600 fill-current" />}
              <span className="text-blue-600 text-sm font-medium">• 1st</span>
            </div>
            <p className="text-sm text-gray-600 hover:text-blue-700 cursor-pointer">
              {post.author.title || "Software Engineer at Tech Company"}
            </p>
            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
              <span>{formatTime(post.timestamp)}</span>
              <span>•</span>
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
                  <circle cx="8" cy="6" r="2" />
                </svg>
                Global
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3">
          <p className="text-gray-900 text-sm leading-relaxed">{post.content}</p>
        </div>
      </div>
      {post.image && (
        <div className="w-full">
          <Image
            width={500}
            height={300}
            src={post.image || "/placeholder.svg?height=300&width=500"}
            alt="Post content"
            className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        </div>
      )}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white fill-current" />
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Heart className="w-2 h-2 text-white fill-current" />
              </div>
            </div>
            <span className="hover:text-blue-700 cursor-pointer">{formatNumber(post.engagement?.likes || 127)}</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="hover:text-blue-700 cursor-pointer">{post.engagement?.comments || 23} comments</span>
            <span className="hover:text-blue-700 cursor-pointer">{post.engagement?.shares || 8} reposts</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 h-10 font-medium"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 h-10 font-medium"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Comment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 h-10 font-medium"
          >
            <Repeat2 className="w-4 h-4 mr-2" />
            Repost
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 h-10 font-medium"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )

  const FacebookPreview = () => (
    <div className="bg-white rounded-lg overflow-hidden w-[500px] shadow-xl border border-gray-200">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.avatar || "/placeholder.svg?height=40&width=40"} />
            <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
              {post.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h3 className="font-semibold text-gray-900 text-base hover:underline cursor-pointer">
                {post.author.name}
              </h3>
              {post.author.verified && <Verified className="w-4 h-4 text-blue-600 fill-current" />}
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <span>{formatTime(post.timestamp)}</span>
              <span>•</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
                <circle cx="8" cy="6" r="2" />
              </svg>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-100 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3">
          <p className="text-gray-900 text-base leading-relaxed">{post.content}</p>
        </div>
      </div>
      {post.image && (
        <div className="w-full">
          <Image
            height={300}
            width={500}
            src={post.image || "/placeholder.svg?height=300&width=500"}
            alt="Post content"
            className="w-full h-64 object-cover cursor-pointer"
          />
        </div>
      )}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white fill-current" />
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Heart className="w-2 h-2 text-white fill-current" />
              </div>
            </div>
            <span className="hover:underline cursor-pointer">{formatNumber(post.engagement?.likes || 89)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hover:underline cursor-pointer">{post.engagement?.comments || 15} comments</span>
            <span className="hover:underline cursor-pointer">{post.engagement?.shares || 3} shares</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="flex-1 text-gray-600 hover:bg-gray-100 h-9 font-medium">
              <ThumbsUp className="w-4 h-4 mr-2" />
              Like
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-gray-600 hover:bg-gray-100 h-9 font-medium">
              <MessageCircle className="w-4 h-4 mr-2" />
              Comment
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-gray-600 hover:bg-gray-100 h-9 font-medium">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const TwitterPreview = () => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden w-[500px] shadow-xl hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author.avatar || "/placeholder.svg?height=48&width=48"} />
            <AvatarFallback className="text-sm bg-gray-200">
              {post.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h3 className="font-bold text-gray-900 text-base hover:underline cursor-pointer">{post.author.name}</h3>
              {post.author.verified && <Verified className="w-5 h-5 text-blue-500 fill-current" />}
              <span className="text-gray-500 text-base">@{post.author.username}</span>
              <span className="text-gray-500 text-base">·</span>
              <span className="text-gray-500 text-base hover:underline cursor-pointer">
                {formatTime(post.timestamp)}
              </span>
            </div>
            <div className="mt-2">
              <p className="text-gray-900 text-base leading-normal whitespace-pre-wrap">{post.content}</p>
            </div>
            {post.image && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                <Image
                  width={500}
                  height={300}
                  src={post.image || "/placeholder.svg?height=280&width=480"}
                  alt="Post content"
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            <div className="flex items-center justify-between mt-3 max-w-md">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full group"
              >
                <MessageCircle className="w-5 h-5 group-hover:fill-current" />
                <span className="ml-2 text-sm">{formatNumber(post.engagement?.comments || 24)}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-green-500 hover:bg-green-50 p-2 rounded-full group"
              >
                <Repeat2 className="w-5 h-5" />
                <span className="ml-2 text-sm">{formatNumber(post.engagement?.retweets || 12)}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-full group"
              >
                <Heart className="w-5 h-5 group-hover:fill-current" />
                <span className="ml-2 text-sm">{formatNumber(post.engagement?.likes || 156)}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full"
              >
                <Share className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const InstagramPreview = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-[400px] shadow-xl">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
            <Avatar className="w-full h-full border-2 border-white">
              <AvatarImage src={post.author.avatar || "/placeholder.svg?height=32&width=32"} />
              <AvatarFallback className="text-xs">
                {post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-sm">{post.author.username}</span>
              {post.author.verified && <Verified className="w-3 h-3 text-blue-500 fill-current" />}
            </div>
            <span className="text-xs text-gray-500">{post.author.title || "Location"}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-900 p-1">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>
      {post.image && (
        <div className="w-full aspect-square">
          <Image
            width={400}
            height={400}
            src={post.image || "/placeholder.svg?height=400&width=400"}
            alt="Post content"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-900 hover:text-red-500 p-0">
              <Heart className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-900 p-0">
              <MessageCircle className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-900 p-0">
              <Send className="w-6 h-6" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-900 p-0">
            <Bookmark className="w-6 h-6" />
          </Button>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-sm">{formatNumber(post.engagement?.likes || 234)} likes</p>
          <div className="text-sm">
            <span className="font-semibold">{post.author.username}</span>
            <span className="ml-2">{post.content}</span>
          </div>
          <p className="text-gray-500 text-sm cursor-pointer">View all {post.engagement?.comments || 18} comments</p>
          <p className="text-gray-400 text-xs uppercase tracking-wide">{formatTime(post.timestamp)} ago</p>
        </div>
      </div>
    </div>
  )

  const renderPreview = () => {
    switch (platform) {
      case "LINKEDIN":
        return <LinkedInPreview />
      case "FACEBOOK":
        return <FacebookPreview />
      case "TWITTER":
        return <TwitterPreview />
      case "INSTAGRAM":
        return <InstagramPreview />
      default:
        return <LinkedInPreview />
    }
  }

  return (
    <div className="absolute z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200">
      {renderPreview()}
    </div>
  )
}
