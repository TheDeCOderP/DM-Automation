'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { useState } from 'react';
import { 
  Plus, 
  RefreshCw, 
  AlertCircle, 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Brand, ExternalBlogSite } from '@prisma/client';

import SiteForm from './_components/SiteForm';
import BlogSiteTable from './_components/BlogSiteTable';
import BlogSiteDetailsModal from './_components/BlogSiteDetailsModal';

interface ExternalBlogSiteWithBrand extends ExternalBlogSite {
  brand: {
    name: string;
  };
  _count: {
    blogPosts: number;
  };
}

interface SiteFormPayload {
  name: string;
  platform: string;
  baseUrl: string;
  apiEndpoint: string;
  apiKey: string;
  secretKey: string;
  username: string;
  authType: string;
  contentType: string;
  brandId: string;
  config: {
    fieldMapping: Record<string, string>;
    contentType: string;
  };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Components
function BlogSiteRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/20 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-xl mb-2">Failed to load blog sites</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          We couldn&apos;t fetch your blog sites. This might be due to a network issue or server problem.
        </p>
        <Button onClick={onRetry} variant="outline" className="gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

function PageHeader({ onAddSite }: { onAddSite: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            Blog Management
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
          External Blog Sites
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Connect and manage your external blog platforms. Sync your content across multiple blogging platforms.
        </p>
      </div>
      <Button
        onClick={onAddSite}
        className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-200 gap-2 h-11"
        size="lg"
      >
        <Plus className="h-5 w-5" />
        <span>Add Site</span>
      </Button>
    </div>
  );
}

// Main Component
export default function BlogSitesPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ExternalBlogSiteWithBrand | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ExternalBlogSite | null>(null);

  const { data: brandsData } = useSWR('/api/brands', fetcher);

  const { data: sitesData, error, isLoading, mutate } = useSWR('/api/blogs/sites', fetcher);

  const brands: Brand[] = brandsData?.data || [];
  const sites: ExternalBlogSiteWithBrand[] = sitesData?.externalSites || [];

  const handleSubmit = async (payload: SiteFormPayload, isEditing?: boolean) => {
    try {
      const url = isEditing ? `/api/blogs/sites/${editingSite?.id}` : '/api/blogs/sites';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        mutate();
        setShowAddForm(false);
        setEditingSite(null);
        toast.success(`Blog site ${isEditing ? 'updated' : 'added'} successfully!`);
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} external site:`, error);
      toast.error(`Error ${isEditing ? 'updating' : 'creating'} external site`);
    }
  };

  const testConnection = async (siteId: string) => {
    const promise = fetch(`/api/blogs/sites/${siteId}/test`, {
      method: 'POST',
    });

    toast.promise(promise, {
      loading: 'Testing connection...',
      success: async (response) => {
        if (response.ok) {
          return 'Connection successful!';
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Connection failed');
        }
      },
      error: (error) => `Connection failed: ${error.message}`
    });
  };

  const handleDelete = async (site: ExternalBlogSite) => {
    const promise = fetch(`/api/blogs/sites/${site.id}`, {
      method: 'DELETE',
    });

    toast.promise(promise, {
      loading: 'Deleting blog site...',
      success: () => {
        mutate();
        return 'Blog site deleted successfully';
      },
      error: (error) => `Error deleting blog site: ${error.message}`
    });
  };

  const openDetailsModal = (site: ExternalBlogSiteWithBrand) => {
    setSelectedSite(site);
    setShowDetailsModal(true);
  };

  const handleEditSite = (site: ExternalBlogSite) => {
    setEditingSite(site);
    setShowAddForm(true);
  };

  const handleRetry = () => {
    mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blog Site</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, index) => (
                <BlogSiteRowSkeleton key={index} />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader onAddSite={() => {
        setEditingSite(null);
        setShowAddForm(true);
      }} />

      <Separator className="bg-border/50" />

      <BlogSiteTable
        sites={sites}
        onTestConnection={testConnection}
        onViewDetails={openDetailsModal}
        onDeleteSite={handleDelete}
        onEditSite={handleEditSite}
      />

      {/* Add/Edit Site Modal */}
      <SiteForm
        open={showAddForm}
        onOpenChange={(open) => {
          setShowAddForm(open);
          if (!open) setEditingSite(null);
        }}
        brands={brands}
        onSubmit={handleSubmit}
        editingSite={editingSite}
      />

      {/* Site Details Modal */}
      {selectedSite && (
        <BlogSiteDetailsModal
          site={selectedSite}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
        />
      )}
    </div>
  );
}