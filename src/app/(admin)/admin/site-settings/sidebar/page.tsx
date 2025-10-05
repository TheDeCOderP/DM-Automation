"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DragDropContext, DropResult, DroppableProvided } from "@hello-pangea/dnd";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, Plus, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Import components
import { ItemModal } from "./_components/ItemModal";
import { ItemsList } from "./_components/ItemsList";
import { GroupModal } from "./_components/GroupModal";
import { GroupsList } from "./_components/GroupsList";

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

    // If dropped outside any droppable area or didn't move
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    if (type === 'group') {
      // Handle group reordering
      const newGroups = Array.from(groups);
      const [movedGroup] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, movedGroup);
      
      setGroups(newGroups);

      try {
        const res = await fetch("/api/site-settings/sidebar/groups/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupIds: newGroups.map(g => g.id) }),
        });
        if (!res.ok) throw new Error("Request failed");
        toast.success("Groups reordered successfully");
      } catch (error) {
        console.error('Reorder groups error:', error);
        toast.error("Failed to reorder groups");
        await fetchGroups();
      }
    } else if (type === 'item') {
      // Handle item reordering within the same group
      if (source.droppableId === destination.droppableId && selectedGroup) {
        const groupId = source.droppableId.replace('items-', '');
        const group = groups.find(g => g.id === groupId);
        
        if (group) {
          const newItems = Array.from(group.items);
          const [movedItem] = newItems.splice(source.index, 1);
          newItems.splice(destination.index, 0, movedItem);
          
          const updatedGroups = groups.map(g => 
            g.id === groupId ? { ...g, items: newItems } : g
          );
          setGroups(updatedGroups);

          try {
            const res = await fetch("/api/site-settings/sidebar/items/reorder", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemIds: newItems.map(i => i.id), groupId }),
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
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };
  
  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupModalOpen(true);
  }

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
          <GroupsList
            groups={groups}
            selectedGroupId={selectedGroupId}
            onGroupSelect={handleGroupSelect}
            onEditGroup={handleEditGroup}
            onDeleteGroup={deleteGroup}
          />

          <ItemsList
            selectedGroup={selectedGroup || null}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={deleteItem}
          />
        </div>

        <div className="mt-6">
          <SidebarSettingsSection />
        </div>

        <GroupModal
          isOpen={isGroupModalOpen}
          onOpenChange={setGroupModalOpen}
          editingGroup={editingGroup}
          groups={groups}
          roles={roles}
          isSubmitting={isSubmitting}
          onSubmit={onGroupSubmit}
          onReset={handleGroupModalReset}
        />

        <ItemModal
          isOpen={isItemModalOpen}
          onOpenChange={setItemModalOpen}
          editingItem={editingItem}
          selectedGroup={selectedGroup || null}
          roles={roles}
          isSubmitting={isSubmitting}
          onSubmit={onItemSubmit}
          onReset={handleItemModalReset}
        />
      </div>
    </DragDropContext>
  );
}