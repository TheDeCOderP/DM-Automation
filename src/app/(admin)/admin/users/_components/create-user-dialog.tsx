"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface CreateUserDialogProps {
  roles: { label: string; value: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

// Create a type for your form state
interface UserFormState {
  name: string;
  email: string;
  password: string;
  roleId: string | undefined; // Allow roleId to be a string or undefined
}

export function CreateUserDialog({ roles, open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [working, setWorking] = useState(false);
  // Use the new type for your state and initialize it correctly
  const [form, setForm] = useState<UserFormState>({ name: "", email: "", password: "", roleId: undefined });

  async function handleCreate() {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roleId: form.roleId || undefined }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to create user");
      onOpenChange(false);
      // Reset the form state with the correct type
      setForm({ name: "", email: "", password: "", roleId: undefined });
      onUserCreated();
    } catch (e: unknown) {
      // You should replace this with a toast notification or a modal,
      // as window.alert() is not available in many environments.
      console.error(e); 
      // alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
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
            <Label>Password</Label>
            <Input type="password" value={form.password || ""} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={form.roleId ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, roleId: v || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role (optional)" />
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
          <Button onClick={handleCreate} disabled={working}>
            {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}