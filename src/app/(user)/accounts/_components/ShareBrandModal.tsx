import useSWR from "swr";
import { toast } from "sonner";
import { useState } from "react";
import { Check, Search, X, Share2, UserIcon } from 'lucide-react';

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { User } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ShareBrandModal({
  open,
  onOpenChange,
  brandId,
  brandName,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  brandName: string
  onSuccess: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedRole, setSelectedRole] = useState<string>("PCR-0004") // Default to BrandUser
  const [isSharing, setIsSharing] = useState(false)

  const { data, isLoading } = useSWR(open ? `/api/brands/${brandId}/invite/users` : null, fetcher);
  const { data: rolesData, isLoading: rolesLoading } = useSWR(open ? '/api/roles' : null, fetcher);
  
  // Fix: Access the data directly, not through usersData.data
  const usersData = data?.users || [];

  const filteredUsers = usersData?.filter((user: User) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleShare = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user")
      return
    }

    if (!selectedRole) {
      toast.error("Please select a role")
      return
    }

    setIsSharing(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userIds: Array.from(selectedUsers),
          roleId: selectedRole 
        })
      })

      if (!response.ok) throw new Error("Failed to share brand")

      toast.success(`Brand shared with ${selectedUsers.size} user(s)`)
      setSelectedUsers(new Set())
      setSearchQuery("")
      setSelectedRole("PCR-0004") // Reset to default
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to share brand")
      console.error(error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Brand
          </DialogTitle>
          <DialogDescription>
            Share &quot;{brandName}&quot; with other users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {rolesLoading ? (
                  <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                ) : (
                  rolesData?.roles
                    ?.filter((role: any) => role.name === "BrandAdmin" || role.name === "BrandUser")
                    .map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} {role.description && `- ${role.description}`}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedUsers).map((userId) => {
                const user = usersData?.find((u: User) => u.id === userId)
                return (
                  <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                    {user?.name || user?.email}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => toggleUser(userId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
            </div>
          )}

          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No users found" : "No users available"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user: User) => {
                  const isSelected = selectedUsers.has(user.id)
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleUser(user.id)}
                    >
                      <Avatar className="h-10 w-10 border-2">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.name || "Unknown User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedUsers.size === 0 || !selectedRole || isSharing}
            className="flex-1"
          >
            {isSharing ? "Sharing..." : `Share with ${selectedUsers.size || ""} user${selectedUsers.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
