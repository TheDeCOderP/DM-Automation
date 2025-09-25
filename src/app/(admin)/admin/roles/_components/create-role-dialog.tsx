"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface CreateRoleDialogProps {
  permissions: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleCreated: () => void;
}

export function CreateRoleDialog({ permissions, open, onOpenChange, onRoleCreated }: CreateRoleDialogProps) {
  const [working, setWorking] = useState(false);
  const [name, setName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  function toggle(p: string) {
    setSelectedPerms((curr) => (curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p]));
  }

  async function handleCreate() {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: selectedPerms }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to create role");
      onOpenChange(false);
      onRoleCreated();
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
          <DialogTitle>Create Role</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Role Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-2">
              {permissions.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-2 border rounded px-2 py-1">
                  <input type="checkbox" checked={selectedPerms.includes(p.name)} onChange={() => toggle(p.name)} />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
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
