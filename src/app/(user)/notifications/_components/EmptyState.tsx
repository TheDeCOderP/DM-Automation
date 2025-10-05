'use client';

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  searchQuery: string;
  filter: string;
  onClearFilters: () => void;
}

export function EmptyState({ searchQuery, filter, onClearFilters }: EmptyStateProps) {
  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <Search className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No notifications found</h3>
        <p className="text-muted-foreground max-w-md">
          {searchQuery
            ? `No notifications match "${searchQuery}". Try adjusting your search or filter.`
            : filter === "all"
              ? "You're all caught up! No notifications to show."
              : `No ${filter} notifications found. Try adjusting your filter.`}
        </p>
        {(searchQuery || filter !== "all") && (
          <Button
            variant="outline"
            className="mt-4 bg-transparent"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}