import React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Verified } from 'lucide-react';

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

import { formatTime, formatNumber } from '@/utils/format';
import { PostData } from '@/types/post-data';

export default function InstagramPreview({ post }: { post: PostData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-[500px] shadow-xl">
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
}
