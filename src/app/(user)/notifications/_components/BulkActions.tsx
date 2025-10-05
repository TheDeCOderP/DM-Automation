'use client';

import { CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  pageCount: number;
  filter: string;
  submitting: boolean;
  onSelectAll: (checked: boolean) => void;
  onBulkMarkAsRead: () => void;
  onBulkDelete: () => void;
}

export function BulkActions({
  selectedCount,
  totalCount,
  pageCount,
  filter,
  submitting,
  onSelectAll,
  onBulkMarkAsRead,
  onBulkDelete,
}: BulkActionsProps) {
  return (
    <div className="flex items-center justify-between mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedCount === pageCount && pageCount > 0}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} selected`
              : `${totalCount} ${filter === "all" ? "total" : filter} notifications`}
          </span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={onBulkMarkAsRead}
              disabled={submitting}
            >
              <CheckCheck className="h-4 w-4" />
              Mark read
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-red-600 hover:text-red-700 bg-transparent"
              disabled={submitting}
              onClick={onBulkDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}