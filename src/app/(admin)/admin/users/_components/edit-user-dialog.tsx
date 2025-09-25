"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { User } from "./columns"; 

interface EditUserDialogProps {
  user: User | null;
  roles: { label: string; value: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, roles, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password?: string; roleId?: string | null }>({ name: "", email: "", password: "", roleId: undefined });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name ?? "", email: user.email, password: "", roleId: user.role?.id || undefined });
    }
  }, [user]);

  async function handleUpdate() {
    if (!user) return;
    setWorking(true);
    try {
      const payload: {
        id: string;
        name: string;
        email: string;
        roleId?: string | null;
        password?: string;
      } = { id: user.id, name: form.name, email: form.email, roleId: form.roleId };
      if (form.password && form.password.length > 0) payload.password = form.password;
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to update user");
      onOpenChange(false);
      onUserUpdated();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>New Password (optional)</Label>
            <Input type="password" value={form.password || ""} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={form.roleId ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, roleId: v || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdate} disabled={working || !user}>
            {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
