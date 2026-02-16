import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ExternalBlogSite } from "@prisma/client";

import { getPlatformColor, getPlatformIcon } from "@/utils/ui/icons";
import { formatDate } from "@/utils/format";

interface ExternalBlogSiteWithBrand extends ExternalBlogSite {
  brand: {
    name: string;
  };
  _count: {
    blogPosts: number;
  };
}

export default function BlogSiteDetailsModal({ 
  site, 
  open, 
  onOpenChange 
}: { 
  site: ExternalBlogSiteWithBrand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>Blog Site Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${getPlatformColor(site.platform)} rounded-lg flex items-center justify-center text-white font-semibold`}>
              {getPlatformIcon(site.platform)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{site.name}</h3>
              <p className="text-sm text-muted-foreground">{site.brand.name}</p>
            </div>
          </div>

          <Separator />

          {/* Configuration Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Platform</Label>
              <p className="text-sm">{site.platform}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant={site.isActive ? "default" : "secondary"}>
                {site.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Base URL</Label>
              <p className="text-sm break-all">{site.baseUrl}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">API Endpoint</Label>
              <p className="text-sm break-all">{site.apiEndpoint}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Authentication</Label>
              <p className="text-sm">{site.authType}</p>
            </div>
            {/* <div className="space-y-1">
              <Label className="text-sm font-medium">Posts</Label>
              <p className="text-sm">{site._count.blogPosts}</p>
            </div> */}
          </div>

          {/* Field Mappings */}
          {site.fieldMapping && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Field Mappings</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(site.fieldMapping, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Connection Info */}
          <Separator />
          <div className="space-y-1">
            <Label className="text-sm font-medium">Connected</Label>
            <p className="text-sm">{formatDate(site.createdAt)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}