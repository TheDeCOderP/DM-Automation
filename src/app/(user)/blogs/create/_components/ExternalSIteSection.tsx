import { ExternalLinkIcon, GlobeIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { ExternalBlogSite } from "@prisma/client";

export default function ExternalSitesSection({
  externalSites,
  selectedSiteIds,
  onSiteToggle
}: {
  externalSites: ExternalBlogSite[];
  selectedSiteIds: string[];
  onSiteToggle: (siteId: string) => void;
}) {
  const activeSites = externalSites.filter(site => site.isActive);

  if (activeSites.length === 0) {
    return (
      <div className="text-center py-4 space-y-2 border rounded-lg bg-muted/20">
        <div className="w-8 h-8 mx-auto bg-muted rounded-full flex items-center justify-center">
          <ExternalLinkIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">No external sites connected</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => window.open('/blog/sites', '_blank')}
          >
            Connect sites
          </Button>
        </div>
      </div>
    );
  }

  const handleCardClick = (siteId: string) => (e: React.MouseEvent) => {
    // Only trigger if the click is not directly on the checkbox
    if (!(e.target as HTMLElement).closest('button, input, [role="checkbox"]')) {
      onSiteToggle(siteId);
    }
  };

  const handleCheckboxChange = (siteId: string) => (checked: boolean) => {
    onSiteToggle(siteId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Publish to external sites</Label>
        <span className="text-xs text-muted-foreground">
          {selectedSiteIds.length} of {activeSites.length} selected
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {activeSites.map(site => (
          <div
            key={site.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedSiteIds.includes(site.id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
            onClick={handleCardClick(site.id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                <GlobeIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{site.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {site.platform.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Checkbox
              checked={selectedSiteIds.includes(site.id)}
              onCheckedChange={handleCheckboxChange(site.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}