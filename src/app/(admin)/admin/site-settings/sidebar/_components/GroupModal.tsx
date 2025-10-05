"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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

interface GroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup: SidebarGroup | null;
  groups: SidebarGroup[];
  roles: Role[];
  isSubmitting: boolean;
  onSubmit: (values: z.infer<typeof groupSchema>) => void;
  onReset: () => void;
}

export function GroupModal({
  isOpen,
  onOpenChange,
  editingGroup,
  groups,
  roles,
  isSubmitting,
  onSubmit,
  onReset
}: GroupModalProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { roleIds: [] },
  });

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      onReset();
      reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingGroup ? "Edit" : "Create New"} Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              {...register("title")} 
              placeholder="Enter group title"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Input 
              id="position" 
              type="number" 
              defaultValue={groups.length}
              {...register("position", { valueAsNumber: true })} 
            />
            {errors.position && (
              <p className="text-sm text-red-500">{errors.position.message}</p>
            )}
          </div>
          <div>
            <Label>Role Access</Label>
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <Controller
                    name="roleIds"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value?.includes(role.id)}
                        onCheckedChange={(checked) => {
                          const newRoleIds = checked
                            ? [...(field.value || []), role.id]
                            : (field.value || []).filter(
                                (id: string) => id !== role.id
                              );
                          field.onChange(newRoleIds);
                        }}
                      />
                    )}
                  />
                  <Label htmlFor={`role-${role.id}`}>{role.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" onClick={onReset}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingGroup ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}