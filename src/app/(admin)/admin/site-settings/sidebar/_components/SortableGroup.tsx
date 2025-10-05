"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Edit, Trash, GripVertical } from "lucide-react";

import { SidebarItem } from "@prisma/client";

interface SidebarGroup {
  id: string;
  title: string;
  position: number;
  items: SidebarItem[];
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface SortableGroupProps {
  group: SidebarGroup;
  index: number;
  isSelected: boolean;
  onSelect: (group: SidebarGroup) => void;
  onEdit: (group: SidebarGroup) => void;
  onDelete: (id: string) => void;
}

export function SortableGroup({ group, index, isSelected, onSelect, onEdit, onDelete }: SortableGroupProps) {
  return (
    <Draggable draggableId={group.id} index={index}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`p-3 rounded-md cursor-pointer flex justify-between items-center hover:bg-muted border ${
            isSelected ? 'border-primary bg-primary/10' : 'border-transparent'
          } ${snapshot.isDragging ? 'bg-primary/10 border-primary shadow-md' : ''}`}
          onClick={() => onSelect(group)}
        >
          <div className="flex items-center gap-2" {...provided.dragHandleProps}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <span>{group.title}</span>
          </div>
          <div className="flex items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group.id);
              }}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </li>
      )}
    </Draggable>
  );
}