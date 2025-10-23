import { useState } from "react";
import { Trash2, ExternalLink, MoreHorizontal, Settings, Sparkles, TestTube, Edit } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ExternalBlogSite } from "@prisma/client";
import { getPlatformIcon } from "@/utils/ui/icons";

export default function BlogSiteTable({
  sites,
  onTestConnection,
  onViewDetails,
  onDeleteSite,
  onEditSite
}: {
  sites: ExternalBlogSite[];
  onTestConnection: (siteId: string) => void;
  onViewDetails: (site: ExternalBlogSite) => void;
  onDeleteSite: (site: ExternalBlogSite) => void;
  onEditSite: (site: ExternalBlogSite) => void;
}) {
  const [siteToDelete, setSiteToDelete] = useState<ExternalBlogSite | null>(null);

  const handleDeleteClick = (site: ExternalBlogSite) => {
    setSiteToDelete(site);
  };

  const handleDeleteConfirm = (siteId: string) => {
    onDeleteSite(siteToDelete!);
    setSiteToDelete(null);
  };

  return (
    <>
      <Card className="shadow-sm border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/50">
              <TableHead className="font-semibold text-foreground">Blog Site</TableHead>
              <TableHead className="font-semibold text-foreground">Platform</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">Posts</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">No blog sites connected</h3>
                    <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                      Get started by connecting your first external blog platform to sync your content.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sites.map(site => (
                <TableRow key={site.id} className={`${site == siteToDelete ? "bg-secondary/20 select-none" : ""} hover:bg-secondary/20 transition-colors border-border/50`}>
                  {/* Blog Site */}
                  <TableCell>
                    <div 
                      onClick={() => onViewDetails(site)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      {getPlatformIcon(site.platform, "h-6 w-6")}
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {site.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Platform */}
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {site.platform.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={site.isActive ? "default" : "secondary"}>
                      {site.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  {/* Posts */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{site._count.blogPosts}</span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={site == siteToDelete}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary/50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onViewDetails(site)}
                            className="gap-2 cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditSite(site)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onTestConnection(site.id)}
                            className="gap-2 cursor-pointer"
                          >
                            <TestTube className="h-4 w-4" />
                            Test Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(site)}
                            className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Site
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {siteToDelete && (
        <DeleteConfirmationDialog
          site={siteToDelete}
          open={!!siteToDelete}
          onOpenChange={(open) => !open && setSiteToDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}

function DeleteConfirmationDialog({
  site,
  open,
  onOpenChange,
  onConfirm
}: {
  site: ExternalBlogSite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (siteId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Blog Site</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{site.name}</strong>? This action cannot be undone and all associated data will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => onConfirm(site.id)}
          >
            Delete Site
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}