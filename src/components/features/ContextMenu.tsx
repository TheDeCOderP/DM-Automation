"use client"

import type React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, Trash2, Copy, Share, Calendar, Eye } from "lucide-react"

interface PostContextMenuProps {
  children: React.ReactNode
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onShare?: () => void
  onSchedule?: () => void
  onPreview?: () => void
}

export function PostContextMenu({
  children,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onSchedule,
  onPreview,
}: PostContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onPreview} className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview
        </ContextMenuItem>
        <ContextMenuItem onClick={onEdit} className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Edit Post
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate} className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onSchedule} className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Reschedule
        </ContextMenuItem>
        <ContextMenuItem onClick={onShare} className="flex items-center gap-2">
          <Share className="w-4 h-4" />
          Share
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="flex items-center gap-2 text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
