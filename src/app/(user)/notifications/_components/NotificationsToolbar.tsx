'use client';

import { useState } from "react";
import { Search, Filter, CheckCheck, Zap, Bell, CheckCircle2, XCircle, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NotificationsToolbarProps {
  searchQuery: string;
  filter: string;
  unreadCount: number;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsToolbar({
  searchQuery,
  filter,
  unreadCount,
  onSearchChange,
  onFilterChange,
  onMarkAllAsRead,
}: NotificationsToolbarProps) {
  const formatNotificationType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 mt-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 -z-10"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              <Filter className="h-4 w-4" />
              Filter
              {filter !== "all" && (
                <Badge
                  variant="secondary"
                  className="ml-1 px-2 py-0.5 text-xs bg-primary/10 text-primary border-primary/20"
                >
                  {formatNotificationType(filter)}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={filter === "all"}
              onCheckedChange={() => onFilterChange("all")}
            >
              <Bell className="mr-2 h-4 w-4" />
              All notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "unread"}
              onCheckedChange={() => onFilterChange("unread")}
            >
              <Zap className="mr-2 h-4 w-4" />
              Unread only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "read"}
              onCheckedChange={() => onFilterChange("read")}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Read only
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filter === "post_published"}
              onCheckedChange={() => onFilterChange("post_published")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
              Post published
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "post_failed"}
              onCheckedChange={() => onFilterChange("post_failed")}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Post failed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "post_scheduled"}
              onCheckedChange={() => onFilterChange("post_scheduled")}
            >
              <Calendar className="mr-2 h-4 w-4 text-blue-500" />
              Post scheduled
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter === "account_disconnected"}
              onCheckedChange={() => onFilterChange("account_disconnected")}
            >
              <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
              Account disconnected
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={onMarkAllAsRead}
            className="gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>
    </div>
  );
}