"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Edit, Trash, GripVertical } from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  position: number;
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface SortableItemProps {
  item: SidebarItem;
  index: number;
  onEdit: (item: SidebarItem) => void;
  onDelete: (id: string) => void;
}

export function SortableItem({ item, index, onEdit, onDelete }: SortableItemProps) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`p-3 rounded-md border flex items-center justify-between hover:bg-muted ${
            snapshot.isDragging ? 'bg-primary/10 border-primary shadow-md' : ''
          }`}
        >
          <div className="flex items-center gap-3" {...provided.dragHandleProps}>
            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.href} • pos {item.position ?? 0}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(item)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(item.id)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </li>
      )}
    </Draggable>
  );
}