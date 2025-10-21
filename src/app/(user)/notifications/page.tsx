'use client';
import useSWR from "swr";
import { toast } from "sonner";
import { useState, useMemo } from "react";

import { EmptyState } from "./_components/EmptyState";
import { Pagination } from "./_components/Pagination";
import { BulkActions } from "./_components/BulkActions";
import { NotificationItem } from "./_components/NotificationItem";
import { NotificationsHeader } from "./_components/NotificationsHeader";
import { NotificationsToolbar } from "./_components/NotificationsToolbar";

import type { Notification } from "@prisma/client";

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .catch(() => null);

export default function NotificationsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const { data: notifications, mutate } = useSWR("/api./_components", fetcher);

  const allNotifications = useMemo(() => notifications?.data || [], [notifications]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((notification: Notification) => {
      // Search filter
      if (searchQuery && !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filter === "unread") return !notification.read;
      if (filter === "read") return notification.read;
      if (filter !== "all") return notification.type === filter;
      return true;
    });
  }, [allNotifications, filter, searchQuery]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const unreadCount = allNotifications.filter((n: Notification) => !n.read).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(paginatedNotifications.map((n: Notification) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications((prev) => [...prev, id]);
    } else {
      setSelectedNotifications((prev) => prev.filter((nId) => nId !== id));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setSubmitting(true);
    try {
      await fetch(`/api./_components/${id}`, { method: "PUT" });
      mutate();
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
      console.error(`Failed to mark notification ${id} as read:`, error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkMarkAsRead = async () => {
    setSubmitting(true);
    try {
      await Promise.all(
        selectedNotifications.map((id) =>
          fetch(`/api./_components/${id}`, { method: "PUT" })
        )
      );
      setSelectedNotifications([]);
      mutate();
      toast.success("Selected notifications marked as read");
    } catch (error) {
      setSelectedNotifications([]);
      console.error("Failed to mark selected notifications as read:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setSubmitting(true);
    try {
      await fetch("/api./_components/mark-all-read", { method: "POST" });
      mutate();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
      console.error("Failed to mark all as read:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    // Implement bulk delete functionality
    toast.info("Bulk delete functionality to be implemented");
  };

  const handleDeleteNotification = async () => {
    // Implement single delete functionality
    toast.info("Delete functionality to be implemented");
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen">
      <NotificationsHeader unreadCount={unreadCount} />
      
      <NotificationsToolbar
        searchQuery={searchQuery}
        filter={filter}
        unreadCount={unreadCount}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <BulkActions
        selectedCount={selectedNotifications.length}
        totalCount={filteredNotifications.length}
        pageCount={paginatedNotifications.length}
        filter={filter}
        submitting={submitting}
        onSelectAll={handleSelectAll}
        onBulkMarkAsRead={handleBulkMarkAsRead}
        onBulkDelete={handleBulkDelete}
      />

      {paginatedNotifications.length === 0 ? (
        <EmptyState
          searchQuery={searchQuery}
          filter={filter}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <div className="space-y-6">
          {paginatedNotifications.map((notification: Notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isSelected={selectedNotifications.includes(notification.id)}
              submitting={submitting}
              onSelect={handleSelectNotification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          totalItems={filteredNotifications.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}