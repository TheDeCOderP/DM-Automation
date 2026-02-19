'use client';

import useSWR from "swr";
import { useEffect, useState } from "react";
import { Bell, CheckCircle, AlertCircle, Clock, Unlink, CreditCard, RefreshCcw } from "lucide-react";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { getPlatformIcon } from "@/utils/ui/icons";
import { formatDateTime } from "@/utils/format";

// Define NotificationType enum locally for client-side use
enum NotificationType {
  POST_PUBLISHED = 'POST_PUBLISHED',
  POST_FAILED = 'POST_FAILED',
  POST_SCHEDULED = 'POST_SCHEDULED',
  ACCOUNT_DISCONNECTED = 'ACCOUNT_DISCONNECTED',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  GENERAL = 'GENERAL'
}

// Define the possible metadata types for each notification type
type PostPublishedMetadata = {
  platform: string;
  postId: string;
  postUrl: string;
};

type PostFailedMetadata = {
  platform: string;
  postId: string;
  error: string;
};

type PostScheduledMetadata = {
  platform: string;
  postId: string;
  scheduledTime: string;
};

type AccountDisconnectedMetadata = {
  platform: string;
};

type SubscriptionRenewalMetadata = {
  plan: string;
  renewalDate: string;
};

type NotificationMetadata = 
  | PostPublishedMetadata
  | PostFailedMetadata
  | PostScheduledMetadata
  | AccountDisconnectedMetadata
  | SubscriptionRenewalMetadata
  | null;

// Define the complete Notification type
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: NotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationsListProps {
  notifications: Notification[];
}

function NotificationsList({ notifications = [] }: NotificationsListProps) {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_PUBLISHED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case NotificationType.POST_FAILED:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.POST_SCHEDULED:
        return <Clock className="h-5 w-5 text-primary" />;
      case NotificationType.ACCOUNT_DISCONNECTED:
        return <Unlink className="h-5 w-5 text-orange-500" />;
      case NotificationType.SUBSCRIPTION_RENEWAL:
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Type guard to check if metadata has platform property
  const hasPlatform = (metadata: NotificationMetadata): metadata is 
    PostPublishedMetadata | PostFailedMetadata | PostScheduledMetadata | AccountDisconnectedMetadata => {
    return metadata !== null && 'platform' in metadata;
  };

  // Type guard for PostFailedMetadata
  const isPostFailed = (notification: Notification): notification is Notification & {
    type: NotificationType;
    metadata: PostFailedMetadata;
  } => {
    return notification.type === NotificationType.POST_FAILED && 
           notification.metadata !== null && 
           'error' in notification.metadata;
  };

  // Type guard for PostPublishedMetadata
  const isPostPublished = (
    notification: Notification
  ): notification is Notification & { metadata: PostPublishedMetadata } => {
    return (
      notification.type === NotificationType.POST_PUBLISHED &&
      notification.metadata !== null &&
      "postUrl" in notification.metadata
    );
  };

  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start p-4 hover:bg-muted/50 ${!notification.read ? "bg-muted/30" : ""}`}
        >
          <div className="flex-shrink-0 pt-1 pr-3">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
            {hasPlatform(notification.metadata) && (
              <div className="flex items-center mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getPlatformIcon(notification.metadata.platform)}
                  {notification.metadata.platform}
                </Badge>

                {isPostPublished(notification) && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 px-2 ml-2 text-xs"
                    onClick={() => window.open(notification.metadata.postUrl, "_blank")}
                  >
                    View post
                  </Button>
                )}
              </div>
            )}
            {isPostFailed(notification) && (
              <div className="mt-2">
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Error details</summary>
                  <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
                    {JSON.stringify(notification.metadata.error, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export default function NotificationDropdown() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // SWR for notifications
  const { data: notificationData, mutate: mutateNotifications, error, isLoading } = useSWR<{
    success: boolean;
    data: Notification[];
  }>(`/api/notifications?status=unread`, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false, // Don't retry on auth errors
    onError: (err) => {
      // Silently handle auth errors - user might not be logged in
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        console.log('User not authenticated for notifications');
      }
    },
  });

  const notifications = notificationData?.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (error) {
      // Only show error toast for non-auth errors
      if (!error.message?.includes('401') && !error.message?.includes('Unauthorized')) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to fetch notifications');
      }
    }
  }, [error]);

  const handleMarkAllAsRead = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        notifications.map(({ id }) =>
          fetch(`/api/notifications/${id}`, { method: 'PUT' })
        )
      );
      mutateNotifications();
      toast.success('Notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use the mutate function with revalidation
      await mutateNotifications(undefined, { revalidate: true });
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button
              variant="ghost"
              size="icon"
              className="relative border rounded-full h-10 w-10"
          >
              <Bell size={20} className="dark:text-white" />
              {unreadCount > 0 && (
                  <Badge variant="warning" className="absolute -top-0.5 -right-0.5 w-4 h-4 p-0 text-xs flex items-center justify-center bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
              )}
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
          align="end"
          className="w-80 md:w-96 max-h-[80vh] overflow-y-auto backdrop-blur-sm"
      >
          <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs flex items-center gap-1"
                  disabled={isLoading || isSubmitting || isRefreshing}
                  onClick={handleRefresh}
                >
                  <RefreshCcw className={`h-3 w-3 ${isLoading || isSubmitting || isRefreshing ? 'animate-spin' : ''}`}/>
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={isSubmitting || unreadCount === 0}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </Button>
              </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isLoading ? (
              <div className="p-4 flex items-center">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="ml-3 space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                  </div>
              </div>
          ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                  No new notifications
              </div>
          ) : (
              <NotificationsList notifications={notifications}/>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}