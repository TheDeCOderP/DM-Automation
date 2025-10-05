"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SortableGroup } from "./SortableGroup";

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

interface GroupsListProps {
  groups: SidebarGroup[];
  selectedGroupId: string | null;
  onGroupSelect: (group: SidebarGroup) => void;
  onEditGroup: (group: SidebarGroup) => void;
  onDeleteGroup: (id: string) => void;
}

export function GroupsList({
  groups,
  selectedGroupId,
  onGroupSelect,
  onEditGroup,
  onDeleteGroup
}: GroupsListProps) {
  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Sidebar Groups</CardTitle>
        <CardDescription>Drag and drop to reorder. Click to select.</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <Droppable droppableId="groups-list">
            {(provided, snapshot) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 min-h-[100px] ${
                  snapshot.isDraggingOver ? 'bg-primary/5 rounded-md' : ''
                }`}
              >
                {groups.map((group, index) => (
                  <SortableGroup 
                    index={index}
                    key={group.id} 
                    group={group} 
                    isSelected={selectedGroupId === group.id}
                    onSelect={onGroupSelect}
                    onEdit={onEditGroup}
                    onDelete={onDeleteGroup}
                  />
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        ) : (
          <p className="text-muted-foreground">No groups found. Create your first group to get started.</p>
        )}
      </CardContent>
    </Card>
  );
}