"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail, CheckCircle2, XCircle, Clock, Building2,
  User, Send, Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:  { label: "Pending",  icon: Clock,        className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30" },
  REJECTED: { label: "Declined", icon: XCircle,      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30" },
  EXPIRED:  { label: "Expired",  icon: Clock,        className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950/30" },
  REVOKED:  { label: "Revoked",  icon: XCircle,      className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950/30" },
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function InviteCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

export default function InvitesPage() {
  const [responding, setResponding] = useState<string | null>(null);

  // Received (pending invites for me)
  const { data: receivedData, isLoading: loadingReceived, mutate: mutateReceived } =
    useSWR("/api/invites?type=received", fetcher);

  // All received (including history) — reuse the brands API invitations data
  const { data: sentData, isLoading: loadingSent } =
    useSWR("/api/invites", fetcher);

  const pendingInvites = receivedData?.invites ?? [];
  const sentInvites = sentData?.invites ?? [];

  const handleRespond = async (token: string, status: "ACCEPTED" | "REJECTED") => {
    setResponding(token);
    try {
      const res = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "ACCEPTED" ? "Invitation accepted" : "Invitation declined");
      mutateReceived();
    } catch {
      toast.error("Failed to respond to invitation");
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground mt-1">Manage brand invitations sent to you and by you</p>
      </div>

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-2">
            <Mail className="h-4 w-4" />
            Received
            {pendingInvites.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs">{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        {/* Received tab */}
        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <CardDescription>Brands that have invited you to join their team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingReceived ? (
                Array.from({ length: 3 }).map((_, i) => <InviteCardSkeleton key={i} />)
              ) : pendingInvites.length === 0 ? (
                <EmptyState message="No pending invitations" />
              ) : (
                pendingInvites.map((invite: any) => (
                  <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg bg-muted/20">
                    <Avatar className="h-10 w-10 rounded-lg border shrink-0">
                      <AvatarImage src={invite.brand.logo || undefined} />
                      <AvatarFallback className="rounded-lg font-bold text-sm">
                        {invite.brand.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{invite.brand.name}</p>
                        <Badge variant="outline" className="text-xs gap-1 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                      {invite.brand.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{invite.brand.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Invited by {invite.invitedBy.name || invite.invitedBy.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={responding === invite.token}
                        onClick={() => handleRespond(invite.token, "ACCEPTED")}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={responding === invite.token}
                        onClick={() => handleRespond(invite.token, "REJECTED")}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent tab */}
        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sent Invitations</CardTitle>
              <CardDescription>Invitations you have sent to other users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSent ? (
                Array.from({ length: 3 }).map((_, i) => <InviteCardSkeleton key={i} />)
              ) : sentInvites.length === 0 ? (
                <EmptyState message="You haven't sent any invitations yet" />
              ) : (
                sentInvites.map((invite: any) => {
                  const cfg = statusConfig[invite.status] ?? statusConfig.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={invite.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                      <Avatar className="h-10 w-10 rounded-lg border shrink-0">
                        <AvatarImage src={invite.invitedTo?.image || undefined} />
                        <AvatarFallback className="rounded-lg font-bold text-sm">
                          {(invite.invitedTo?.name || invite.invitedTo?.email || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {invite.invitedTo?.name || invite.invitedTo?.email || "Unknown user"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {invite.brand?.name || "Unknown brand"}
                          </span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>Sent {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>Expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`gap-1 text-xs shrink-0 ${cfg.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
