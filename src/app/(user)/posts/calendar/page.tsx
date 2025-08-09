"use client";
import useSWR from "swr";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getPlatformIcon } from "@/utils/ui/icons";
import { Post, Platform } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const platformIconMap = {
  [Platform.FACEBOOK]: getPlatformIcon(Platform.FACEBOOK),
  [Platform.INSTAGRAM]: getPlatformIcon(Platform.INSTAGRAM),
  [Platform.LINKEDIN]: getPlatformIcon(Platform.LINKEDIN),
};
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Status } from "@prisma/client";  


const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CalendarUI() {
  const { data, isLoading, mutate } = useSWR("/api/posts", fetcher, {
    refreshInterval: 300000, // refresh every 5 minutes
  });

  const handleDateClick = (arg: any) => {
    console.log("Date clicked:", arg.dateStr);
    // You could open a modal to create a new post here
  };

  const handleEventClick = (info: any) => {
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

function renderEventContent(eventInfo: any) {
  const platform = eventInfo.event.extendedProps.platform as Platform;
  const status = eventInfo.event.extendedProps.status as Status;
  const PlatformIcon = getPlatformIcon(platform);
  
  const statusVariantMap = {
    [Status.PUBLISHED]: "success",
    [Status.FAILED]: "destructive",
    [Status.SCHEDULED]: "secondary",
    [Status.DRAFTED]: "outline",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-2 p-1 w-full cursor-pointer",
          "border-l-4 rounded-sm", // Compact border indicator
          status === Status.PUBLISHED && "border-l-green-500 bg-green-50",
          status === Status.FAILED && "border-l-red-500 bg-red-50",
          status === Status.SCHEDULED && "border-l-blue-500 bg-blue-50",
          status === Status.DRAFTED && "border-l-gray-500 bg-gray-50",
          "hover:bg-accent transition-colors" // Subtle hover effect
        )}>
          {PlatformIcon}
          <Badge 
            variant={statusVariantMap[status] as "destructive" | "secondary" | "outline" | "default"}
            className="h-5 px-1.5 text-xs"
          >
            {status.substring(0, 3)}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {eventInfo.timeText}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {PlatformIcon}
            <span className="font-medium">{platform}</span>
          </div>
          <p className="break-words text-sm">{eventInfo.event.extendedProps.content}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Status: {status}</span>
            <span>{eventInfo.timeText}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}