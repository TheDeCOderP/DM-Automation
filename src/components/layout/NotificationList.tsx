'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationType } from "@prisma/client";
import { CheckCircle, AlertCircle, Clock, Unlink, CreditCard, Bell } from "lucide-react";
import { getPlatformIcon } from "@/utils/ui/icons";

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

export function NotificationsList({ notifications = [] }: NotificationsListProps) {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_PUBLISHED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case NotificationType.POST_FAILED:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.POST_SCHEDULED:
        return <Clock className="h-5 w-5 text-blue-500" />;
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
                {new Date(notification.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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