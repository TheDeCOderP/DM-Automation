'use client';

import { Bell } from "lucide-react";

interface NotificationsHeaderProps {
  unreadCount: number;
}

export function NotificationsHeader({ unreadCount }: NotificationsHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="relative">
          <Bell className="h-8 w-8 text-primary" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-muted-foreground text-lg">Stay updated with your latest activity</p>
        </div>
      </div>
    </div>
  );
}