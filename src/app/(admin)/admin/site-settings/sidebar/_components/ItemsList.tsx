"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SortableItem } from "./SortableItem";

interface SidebarGroup {
  id: string;
  title: string;
  position: number;
  items: SidebarItem[];
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  position: number;
  roleAccess?: { roleId: string; hasAccess: boolean; role: string }[];
}

interface ItemsListProps {
  selectedGroup: SidebarGroup | null;
  onAddItem: () => void;
  onEditItem: (item: SidebarItem) => void;
  onDeleteItem: (id: string) => void;
}

export function ItemsList({
  selectedGroup,
  onAddItem,
  onEditItem,
  onDeleteItem
}: ItemsListProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {selectedGroup ? `Items in "${selectedGroup.title}"` : "Select a Group"}
          </CardTitle>
        </div>
        {selectedGroup && (
          <Button size="sm" onClick={onAddItem}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {selectedGroup ? (
          selectedGroup.items.length > 0 ? (
            <Droppable droppableId={`items-${selectedGroup.id}`}>
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[100px] ${
                    snapshot.isDraggingOver ? 'bg-primary/5 rounded-md' : ''
                  }`}
                >
                  {selectedGroup.items.map((item, index) => (
                    <SortableItem 
                      key={item.id} 
                      item={item} 
                      index={index}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                    />
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          ) : (
            <p className="text-muted-foreground">No items in this group. Add your first item to get started.</p>
          )
        ) : (
          <p className="text-muted-foreground">Select a group to see its items.</p>
        )}
      </CardContent>
    </Card>
  );
}