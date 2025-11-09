"use client"

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Info, 
  Users, 
  Globe, 
  Calendar,
  ExternalLink,
  UserMinus,
  Shield,
  User,
  BadgeIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { getPlatformIcon } from "@/utils/ui/icons";
import type { BrandWithSocialAccounts, BrandMember } from "@/types/brand";

interface BrandDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandWithSocialAccounts | null;
  onSuccess?: () => void;
}

export default function BrandDetailsModal({
  open,
  onOpenChange,
  brand,
  onSuccess
}: BrandDetailsModalProps) {
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<BrandMember | null>(null);

  if (!brand) return null;

  const handleRemoveUser = async (member: BrandMember) => {
    if (member.isCurrentUser) {
      toast.error("You cannot remove yourself from the brand");
      return;
    }

    setUserToRemove(member);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;

    setRemovingUser(userToRemove.id);
    try {
      const response = await fetch(`/api/brands/${brand.id}/members/${userToRemove.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove user");
      }

      toast.success(`${userToRemove.name || userToRemove.email} has been removed from the brand`);
      onSuccess?.();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user from brand");
    } finally {
      setRemovingUser(null);
      setUserToRemove(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "BrandAdmin":
        return <Shield className="h-4 w-4 text-amber-500" />;
      case "BrandEditor":
        return <BadgeIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "BrandAdmin":
        return "default" as const;
      case "BrandEditor":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 shadow-sm rounded-lg">
                <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
                <AvatarFallback className="font-bold rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  {brand.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-xl font-semibold">{brand.name}</span>
                <Badge variant={getRoleBadgeVariant(brand.userRole || "")} className="gap-1 text-xs">
                  {getRoleIcon(brand.userRole || "")}
                  {brand.userRole}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-4 w-4" />
                    Brand Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {brand.description && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                      <p className="text-sm">{brand.description}</p>
                    </div>
                  )}
                  
                  {brand.website && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Website</h4>
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {brand.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Created</h4>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(brand.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Last Updated</h4>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(brand.updatedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-4 w-4" />
                    Connected Social Accounts ({brand.socialAccounts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.socialAccounts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {brand.socialAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(account.platform)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {account.platformUsername}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {account.platform.toLowerCase()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No social accounts connected</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shared Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Members ({brand.members?.length || 0})
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.members && brand.members.length > 0 ? (
                    <div className="space-y-3">
                      {brand.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {member.name || "Unknown User"}
                                </p>
                                {member.isCurrentUser && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </p>
                            </div>
                            <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                              {getRoleIcon(member.role)}
                              {member.role}
                            </Badge>
                          </div>
                          {brand.isAdmin && !member.isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(member)}
                              disabled={removingUser === member.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No team members</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Brand Invites */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Brand Invites ({brand.brandInvitations?.length || 0})
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.brandInvitations && brand.brandInvitations.length > 0 ? (
                    <div className="space-y-3">
                      {brand.brandInvitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarImage src={invite.invitedTo?.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {invite.invitedTo?.name?.charAt(0).toUpperCase() ||
                                  invite.invitedTo?.email?.charAt(0).toUpperCase() ||
                                  "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {invite.invitedTo?.name || "Unknown User"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {invite.invitedTo?.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-right">
                            <Badge
                              variant={
                                invite.status === "PENDING"
                                  ? "secondary"
                                  : invite.status === "ACCEPTED"
                                  ? "default"
                                  : "outline"
                              }
                              className="capitalize text-xs px-2 py-0.5"
                            >
                              {invite.status.toLowerCase()}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              Expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No pending or active invites</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToRemove?.name || userToRemove?.email}</strong> from &quot;{brand.name}&quot;? 
              They will lose access to this brand and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveUser}
              disabled={removingUser === userToRemove?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingUser === userToRemove?.id ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}