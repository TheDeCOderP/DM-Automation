'use client';

import { CheckCheck, Trash2, MoreHorizontal, Clock, CheckCircle2, XCircle, Calendar, AlertCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@prisma/client";

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  submitting: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification,
  isSelected,
  submitting,
  onSelect,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const getNotificationIcon = (type: string, isRead: boolean) => {
    const iconClass = `h-5 w-5 ${isRead ? "opacity-60" : ""}`;

    switch (type) {
      case "post_published":
        return <CheckCircle2 className={`${iconClass} text-emerald-500`} />;
      case "post_failed":
        return <XCircle className={`${iconClass} text-red-500`} />;
      case "post_scheduled":
        return <Calendar className={`${iconClass} text-blue-500`} />;
      case "account_disconnected":
        return <AlertCircle className={`${iconClass} text-amber-500`} />;
      default:
        return <Bell className={`${iconClass} text-slate-500`} />;
    }
  };

  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card
      className={`group transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${
        !notification.read
          ? "ring-2 ring-primary/10 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-white dark:from-primary/5 dark:via-slate-800 dark:to-slate-800"
          : "hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      <CardContent>
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(notification.id, checked as boolean)}
            className="mt-1"
          />

          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type, notification.read)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <p
                className={`text-sm leading-relaxed ${
                  !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {notification.message}
              </p>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={submitting} onClick={() => onMarkAsRead(notification.id)}>
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark as read
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => onDelete(notification.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className="text-xs px-2 py-1 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {formatNotificationType(notification.type)}
              </Badge>
              <span>•</span>
              <time dateTime={notification.createdAt.toISOString()} className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(notification.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}