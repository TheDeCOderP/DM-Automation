import React from 'react';
import Image from 'next/image';
import { Verified, Heart, MessageCircle, Repeat2, Share } from 'lucide-react';

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

import { formatTime, formatNumber } from '@/utils/format';
import { PostData } from '@/types/post-data';

export default function TwitterPreview({ post }: { post: PostData }) {
  return (
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
              {post.author.verified && <Verified className="w-5 h-5 text-primary fill-current" />}
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
                className="text-gray-500 hover:text-primary hover:bg-blue-50 p-2 rounded-full group"
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
                className="text-gray-500 hover:text-primary hover:bg-blue-50 p-2 rounded-full"
              >
                <Share className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
