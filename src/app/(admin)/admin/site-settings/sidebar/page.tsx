"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DragDropContext, DropResult, Droppable, Draggable } from "@hello-pangea/dnd";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, Plus, GripVertical, Edit, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const SidebarSettingsSection = dynamic(() => import("./_components/SidebarSettingsCard"), { ssr: false });

const sidebarItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Href is required"),
  icon: z.string().optional(),
  position: z.number().min(0).optional(),
  roleIds: z.array(z.string()).optional(),
});

const groupSchema = z.object({
  title: z.string().min(1, "Title is required"),
  position: z.number().min(0),
  roleIds: z.array(z.string()).optional(),
});

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

interface Role {
  id: string;
  name: string;
}

export default function SidebarAdminPage() {
  const [groups, setGroups] = useState<SidebarGroup[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SidebarItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<SidebarGroup | null>(null);

  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;

  const { register: registerGroup, handleSubmit: handleSubmitGroup, reset: resetGroup } = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { roleIds: [] },
  });

  const { reset: resetItem } = useForm<z.infer<typeof sidebarItemSchema>>({
    resolver: zodResolver(sidebarItemSchema),
    defaultValues: { roleIds: [] },
  });

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/site-settings/sidebar");
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      const sortedGroups = data.data
        .sort((a: SidebarGroup, b: SidebarGroup) => a.position - b.position)
        .map((group: SidebarGroup) => ({
          ...group,
          items: group.items.sort((a: SidebarItem, b: SidebarItem) => a.position - b.position),
        }));
      setGroups(sortedGroups);
      
      if (!selectedGroupId && sortedGroups.length > 0) {
        setSelectedGroupId(sortedGroups[0].id);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error("Failed to fetch sidebar groups");
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data.roles);
    } catch (error) {
      console.error('Fetch roles error:', error);
      toast.error("Failed to fetch roles");
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchRoles();
  }, [fetchGroups, fetchRoles]);

  const handleGroupSelect = useCallback((group: SidebarGroup) => {
    setSelectedGroupId(group.id);
  }, []);

  const handleEditGroup = (group: SidebarGroup) => {
    setEditingGroup(group);
    setGroupModalOpen(true);
  };

  const handleEditItem = useCallback((item: SidebarItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  }, []);

  const onGroupSubmit = async (values: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true);
    try {
      const method = editingGroup ? "PUT" : "POST";
      const url = "/api/site-settings/sidebar/groups";
      const body = editingGroup 
        ? { ...values, id: editingGroup.id } 
        : { ...values, position: values.position ?? groups.length };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");

      toast.success(`Group ${editingGroup ? 'updated' : 'created'} successfully`);
      setGroupModalOpen(false);
      setEditingGroup(null);
      resetGroup();
      
      await fetchGroups();

    } catch (error) {
      console.error('Group submit error:', error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onItemSubmit = async (values: z.infer<typeof sidebarItemSchema>) => {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = "/api/site-settings/sidebar/items";
      const body = editingItem 
        ? { ...values, id: editingItem.id } 
        : { ...values, sidebarGroupId: selectedGroup.id };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");

      toast.success(`Item ${editingItem ? 'updated' : 'added'} successfully`);
      setItemModalOpen(false);
      setEditingItem(null);
      await fetchGroups();

    } catch (error) {
      console.error('Item submit error:', error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch("/api/site-settings/sidebar/groups", { 
        method: "DELETE", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Group deleted");
      if (selectedGroupId === id) {
        setSelectedGroupId(null);
      }
      await fetchGroups();
    } catch (error) {
      console.error('Delete group error:', error);
      toast.error("Failed to delete group");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch("/api/site-settings/sidebar/items", { 
        method: "DELETE", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Item deleted");
      await fetchGroups();
    } catch (error) {
      console.error('Delete item error:', error);
      toast.error("Failed to delete item");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    console.log('Drag ended:', { source, destination, type });

    // If dropped outside any droppable area or didn't move
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      console.log('No movement or dropped outside');
      return;
    }

    console.log('Processing drag of type:', type);

    if (type === 'group') {
      // Handle group reordering
      const newGroups = Array.from(groups);
      const [movedGroup] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, movedGroup);
      
      // Update positions
      const updatedGroups = newGroups.map((group, index) => ({
        ...group,
        position: index
      }));
      
      setGroups(updatedGroups);

      try {
        const res = await fetch("/api/site-settings/sidebar/groups/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupIds: updatedGroups.map(g => g.id) }),
        });
        if (!res.ok) throw new Error("Request failed");
        toast.success("Groups reordered successfully");
      } catch (error) {
        console.error('Reorder groups error:', error);
        toast.error("Failed to reorder groups");
        await fetchGroups();
      }
    } else if (type === 'item') {
      // Handle item reordering
      const groupId = source.droppableId.replace('items-', '');
      const group = groups.find(g => g.id === groupId);
      
      if (group) {
        const newItems = Array.from(group.items);
        const [movedItem] = newItems.splice(source.index, 1);
        newItems.splice(destination.index, 0, movedItem);
        
        // Update positions
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          position: index
        }));
        
        const updatedGroups = groups.map(g => 
          g.id === groupId ? { ...g, items: updatedItems } : g
        );
        setGroups(updatedGroups);

        try {
          const res = await fetch("/api/site-settings/sidebar/items/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              itemIds: updatedItems.map(i => i.id), 
              groupId 
            }),
          });
          if (!res.ok) throw new Error("Request failed");
          toast.success("Items reordered successfully");
        } catch (error) {
          console.error('Reorder items error:', error);
          toast.error("Failed to reorder items");
          await fetchGroups();
        }
      }
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };
  
  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupModalOpen(true);
  };

  const handleGroupModalReset = () => {
    setEditingGroup(null);
    resetGroup();
  };

  const handleItemModalReset = () => {
    setEditingItem(null);
    resetItem();
  };

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sidebar className="w-8 h-8" /> Manage Sidebar
          </h1>
          <Button onClick={handleNewGroup}>
            <Plus className="w-4 h-4 mr-2" /> New Group
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Groups List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="groups" type="group">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] ${
                      snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                  >
                    {groups.map((group, index) => (
                      <Draggable key={group.id} draggableId={group.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 border rounded-lg flex items-center justify-between ${
                              snapshot.isDragging ? 'shadow-lg bg-white dark:bg-gray-900' : ''
                            } ${
                              selectedGroupId === group.id ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => handleGroupSelect(group)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>
                              <span className="font-medium truncate">{group.title}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditGroup(group);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGroup(group.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {groups.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No groups found. Create one!
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {selectedGroup ? `${selectedGroup.title} - Items` : 'Select a group'}
                </CardTitle>
                {selectedGroup && (
                  <Button onClick={handleAddItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedGroup ? (
                <Droppable droppableId={`items-${selectedGroup.id}`} type="item">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] ${
                        snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                    >
                      {selectedGroup.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-3 border rounded-lg flex items-center justify-between ${
                                snapshot.isDragging ? 'shadow-lg bg-white dark:bg-gray-900' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                  <div className="font-medium">{item.label}</div>
                                  <div className="text-sm text-gray-500">{item.href}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {selectedGroup.items.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No items in this group. Add one!
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Please select a group from the left panel
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <SidebarSettingsSection />
        </div>
      </div>

      {/* Modals - You'll need to implement these or import them */}
      {/* GroupModal and ItemModal components go here */}
    </DragDropContext>
  );
}