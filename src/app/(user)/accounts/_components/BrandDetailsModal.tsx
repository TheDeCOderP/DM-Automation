"use client"

import { useState, useEffect } from "react";
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
  RefreshCw,
  Ban,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getPlatformIcon } from "@/utils/ui/icons";
import type { BrandWithSocialAccounts, BrandMember } from "@/types/brand";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface BrandDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandWithSocialAccounts | null;
  onSuccess?: () => void;
  onShare?: () => void;
}

export default function BrandDetailsModal({
  open,
  onOpenChange,
  brand,
  onSuccess,
  onShare,
}: BrandDetailsModalProps) {
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<BrandMember | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesError, setRolesError] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (open && brand?.isAdmin) {
      setRolesError(false);
      fetch("/api/roles")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load roles");
          return res.json();
        })
        .then((data) => {
          const brandRoles = (data.roles || []).filter(
            (r: Role) => r.name === "BrandAdmin" || r.name === "BrandUser"
          );
          setRoles(brandRoles);
        })
        .catch(() => {
          setRolesError(true);
          toast.error("Failed to load roles. Role dropdowns may be unavailable.");
        });
    }
  }, [open, brand?.isAdmin]);

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

  const handleUpdateMemberRole = async (memberId: string, roleId: string) => {
    setUpdatingRole(memberId);
    try {
      const response = await fetch(`/api/brands/${brand.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      toast.success("Role updated successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleUpdateInviteRole = async (inviteId: string, roleId: string) => {
    setUpdatingRole(inviteId);
    try {
      const response = await fetch(`/api/brands/${brand.id}/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update invite role");
      }

      toast.success("Invite role updated successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Error updating invite role:", error);
      toast.error("Failed to update invite role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const confirmRevokeInvite = async () => {
    if (!inviteToRevoke) return;

    setRevokingInvite(inviteToRevoke.id);
    try {
      const response = await fetch(`/api/brands/${brand.id}/invites/${inviteToRevoke.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke invitation");
      }

      toast.success(`Invitation to ${inviteToRevoke.name} has been revoked`);
      onSuccess?.();
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to revoke invitation");
    } finally {
      setRevokingInvite(null);
      setInviteToRevoke(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "BrandAdmin":
        return <Shield className="h-4 w-4 text-amber-500" />;
      case "BrandEditor":
        return <BadgeIcon className="h-4 w-4 text-primary" />;
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

  const getInviteStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary" as const;
      case "ACCEPTED":
        return "default" as const;
      case "EXPIRED":
        return "destructive" as const;
      case "REVOKED":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
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
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
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
                          {account.platform === "PINTEREST" && (
                            <RefreshBoardsButton platformUserId={account.platformUserId} />
                          )}
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
                            {brand.isAdmin && !member.isCurrentUser && !rolesError ? (
                              <Select
                                value={roles.find((r) => r.name === member.role)?.id || ""}
                                onValueChange={(value) => handleUpdateMemberRole(member.id, value)}
                                disabled={updatingRole === member.id}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue placeholder={member.role} />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id} className="text-xs">
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                                {getRoleIcon(member.role)}
                                {member.role}
                              </Badge>
                            )}
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
                    {brand.isAdmin && onShare && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          onShare();
                        }}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Invite Members
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.brandInvitations && brand.brandInvitations.length > 0 ? (
                    <div className="space-y-3">
                      {brand.brandInvitations.map((invite) => {
                        const inviteRoleId = (invite.metadata as any)?.roleId as string | undefined;
                        const roleName = roles.find((r) => r.id === inviteRoleId)?.name || "BrandUser";
                        const canRevoke = brand.isAdmin && (invite.status === "PENDING" || invite.status === "EXPIRED");
                        return (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 border shrink-0">
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
                              {brand.isAdmin && invite.status === "PENDING" && !rolesError ? (
                                <Select
                                  value={inviteRoleId || roles.find((r) => r.name === "BrandUser")?.id || ""}
                                  onValueChange={(value) => handleUpdateInviteRole(invite.id, value)}
                                  disabled={updatingRole === invite.id}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.id} value={role.id} className="text-xs">
                                        {role.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={getRoleBadgeVariant(roleName)} className="gap-1 text-xs shrink-0">
                                  {roleName}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant={getInviteStatusVariant(invite.status)}
                                  className="capitalize text-xs px-2 py-0.5"
                                >
                                  {invite.status.toLowerCase()}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {invite.status === "EXPIRED"
                                    ? `Expired ${format(new Date(invite.expiresAt), "MMM d, yyyy")}`
                                    : `Expires ${format(new Date(invite.expiresAt), "MMM d, yyyy")}`}
                                </span>
                              </div>
                              {canRevoke && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setInviteToRevoke({
                                      id: invite.id,
                                      name: invite.invitedTo?.name || invite.invitedTo?.email || "this user",
                                    })
                                  }
                                  disabled={revokingInvite === invite.id}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                  title="Revoke invitation"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No pending or active invites</p>
                      {brand.isAdmin && onShare && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            onShare();
                          }}
                          className="mt-3 gap-1.5"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Invite Members
                        </Button>
                      )}
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

      {/* Revoke Invitation Confirmation Dialog */}
      <AlertDialog open={!!inviteToRevoke} onOpenChange={(open) => !open && setInviteToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation sent to <strong>{inviteToRevoke?.name}</strong>?
              They will no longer be able to accept this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevokeInvite}
              disabled={revokingInvite === inviteToRevoke?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {revokingInvite === inviteToRevoke?.id ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RefreshBoardsButton({ platformUserId }: { platformUserId: string }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/accounts/pinterest/pages?platformUserId=${encodeURIComponent(platformUserId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh boards");
      toast.success(`Synced ${data.pages?.length ?? 0} Pinterest boards`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh boards");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={refreshing}
      title="Re-sync Pinterest boards"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      <span className="ml-1 text-xs">{refreshing ? "Syncing…" : "Sync boards"}</span>
    </Button>
  );
}
