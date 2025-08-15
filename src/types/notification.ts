import { NotificationType } from "@prisma/client";

interface NotificationMetadata {
  platform: string;
  postId: string;
  postUrl: string;
  error: string;
}

export interface Notification {
  id: string;
  read: boolean;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  metadata: NotificationMetadata;
}
