import React from 'react'
import Image from "next/image";
import { Verified, MoreHorizontal, ThumbsUp, Heart, MessageCircle, Share } from "lucide-react";

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatNumber, formatTime } from '@/utils/format';

import type { PostData } from '@/types/post-data';

export default function FacebookPreview({ post }: { post: PostData}) {
  return (
    <div className="bg-white rounded-lg overflow-hidden w-[500px] shadow-xl border border-gray-200">
        <div className="p-4">
            <div className="flex items-start space-x-3">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author.avatar || "/placeholder.svg?height=40&width=40"} />
                    <AvatarFallback className="text-sm bg-blue-100 text-primary">
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
                    {post.author.verified && <Verified className="w-4 h-4 text-primary fill-current" />}
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
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
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
}
