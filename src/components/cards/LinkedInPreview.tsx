import React from 'react'
import Image from "next/image";
import { Verified, MoreHorizontal, ThumbsUp, Heart, MessageCircle, Repeat2, Send } from "lucide-react";

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

import { formatTime, formatNumber } from '@/utils/format';
import { PostData } from '@/types/post-data';

export default function LinkedInPreview({ post }: { post: PostData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-[500px] shadow-xl transition-all duration-200 hover:shadow-2xl">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-12 h-12 ring-2 ring-blue-100">
            <AvatarImage src={post.author.avatar || "/placeholder.svg?height=48&width=48"} />
            <AvatarFallback className="text-sm font-semibold bg-blue-100 text-primary">
              {post.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <h3 className="font-semibold text-gray-900 text-base hover:text-primary cursor-pointer hover:underline">
                {post.author.name}
              </h3>
              {post.author.verified && <Verified className="w-4 h-4 text-primary fill-current" />}
              <span className="text-primary text-sm font-medium">• 1st</span>
            </div>
            <p className="text-sm text-gray-600 hover:text-primary cursor-pointer">
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
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white fill-current" />
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Heart className="w-2 h-2 text-white fill-current" />
              </div>
            </div>
            <span className="hover:text-primary cursor-pointer">{formatNumber(post.engagement?.likes || 127)}</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="hover:text-primary cursor-pointer">{post.engagement?.comments || 23} comments</span>
            <span className="hover:text-primary cursor-pointer">{post.engagement?.shares || 8} reposts</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-primary h-10 font-medium"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-primary h-10 font-medium"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Comment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-primary h-10 font-medium"
          >
            <Repeat2 className="w-4 h-4 mr-2" />
            Repost
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-primary h-10 font-medium"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
