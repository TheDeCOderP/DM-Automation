"use client";
import useSWR from "swr";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlatformIcon } from "@/utils/ui/icons";
import { Post, Platform } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { MoreHorizontal, Heart, MessageCircle, Send } from "lucide-react";

import { Status } from "@prisma/client";  
import { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, EventContentArg } from "@fullcalendar/core/index.js";
import { VariantProps } from "class-variance-authority";


const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CalendarUI() {
  const { data, isLoading } = useSWR("/api/posts", fetcher, {
    refreshInterval: 300000, // refresh every 5 minutes
  });

  const handleDateClick = (arg: DateClickArg) => {
    console.log("Date clicked:", arg.dateStr);
    // You could open a modal to create a new post here
  };

  const handleEventClick = (info: EventClickArg) => {
    console.log("Event clicked:", info.event);
    // You could open a modal with post details here
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-xl font-semibold">Content Calendar</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add new post</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Schedule new post</TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
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
            events={data?.posts?.map((post: Post) => ({
              id: post.id,
              title: post.content?.substring(0, 20) + (post.content?.length > 20 ? "..." : ""),
              platform: post.platform,
              start: post.scheduledAt,
              end: post.scheduledAt,
              extendedProps: {
                status: post.status,
                content: post.content,
              },
              backgroundColor: getEventColor(post.platform),
              borderColor: getEventColor(post.platform),
            }))}
            eventContent={renderEventContent}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventClassNames="cursor-pointer"
          />
        )}
      </CardContent>
    </Card>
  );
}

function getEventColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    [Platform.FACEBOOK]: "#1877F2",
    [Platform.INSTAGRAM]: "#E1306C",
    [Platform.TWITTER]: "#1DA1F2",
    [Platform.LINKEDIN]: "#0A66C2",
    [Platform.ALL]: "#6B7280",
  };
  return colors[platform] || "#6B7280";
}

function renderEventContent(eventInfo: EventContentArg) {
  const platform = eventInfo.event.extendedProps.platform as Platform;
  const status = eventInfo.event.extendedProps.status as Status;
  const content = eventInfo.event.extendedProps.content;
  const PlatformIcon = getPlatformIcon(platform);
  
  const statusVariantMap = {
    [Status.PUBLISHED]: "success",
    [Status.FAILED]: "destructive",
    [Status.SCHEDULED]: "secondary",
    [Status.DRAFTED]: "outline",
  };

  const PlatformPreview = ({ platform, content }: { platform: Platform; content: string }) => {
    switch (platform) {
      case Platform.FACEBOOK:
        return (
          <div className="w-64 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                <div className="text-sm font-semibold">Your Page</div>
              </div>
              <p className="text-sm mb-3">{content}</p>
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                Media Preview
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                <span>Like</span>
                <span>Comment</span>
                <span>Share</span>
              </div>
            </div>
          </div>
        );
      case Platform.INSTAGRAM:
        return (
          <div className="w-64 bg-white rounded-lg border border-gray-300">
            <div className="p-2 flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-pink-500"></div>
                <div className="text-sm font-semibold">your_username</div>
              </div>
              <MoreHorizontal className="h-4 w-4" />
            </div>
            <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400">
              Media Preview
            </div>
            <div className="p-2">
              <div className="flex gap-4 mb-2">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm">{content}</p>
            </div>
          </div>
        );
      case Platform.TWITTER:
        return (
          <div className="w-64 bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-400"></div>
              <div>
                <div className="font-bold text-sm">Your Account</div>
                <div className="text-gray-500 text-xs">@yourhandle</div>
              </div>
            </div>
            <p className="text-sm mb-3">{content}</p>
            <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mb-2">
              Media Preview
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span>12 Retweets</span>
              <span>34 Likes</span>
            </div>
          </div>
        );
      case Platform.LINKEDIN:
        return (
          <div className="w-64 bg-white rounded-lg border border-gray-300">
            <div className="p-3">
              <div className="flex gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-700"></div>
                <div>
                  <div className="font-semibold text-sm">Your Name</div>
                  <div className="text-xs text-gray-500">Your Headline</div>
                </div>
              </div>
              <p className="text-sm mb-3">{content}</p>
              <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 mb-2">
                Media Preview
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Like</span>
                <span>Comment</span>
                <span>Repost</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-64 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm">{content}</p>
          </div>
        );
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-2 p-1 w-full cursor-pointer",
          "border-l-4 rounded-sm",
          status === Status.PUBLISHED && "border-l-green-500 bg-green-50",
          status === Status.FAILED && "border-l-red-500 bg-red-50",
          status === Status.SCHEDULED && "border-l-blue-500 bg-blue-50",
          status === Status.DRAFTED && "border-l-gray-500 bg-gray-50",
          "hover:bg-accent transition-colors"
        )}>
          {PlatformIcon}
          <Badge 
            variant={statusVariantMap[status] as VariantProps<typeof Badge>["variant"]}
            className="h-5 px-1.5 text-xs"
          >
            {status.substring(0, 3)}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {eventInfo.timeText}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-0 bg-transparent border-0 shadow-none">
        <PlatformPreview platform={platform} content={content} />
      </TooltipContent>
    </Tooltip>
  );
}