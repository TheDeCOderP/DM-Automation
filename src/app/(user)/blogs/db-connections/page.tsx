'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Database, Plus, Trash2, TestTube, CheckCircle, XCircle, Clock, Pencil, ArrowLeft, Building2, FileText } from 'lucide-react';
import { formatDate } from '@/utils/format';

interface Brand {
  id: string;
  name: string;
  logo?: string;
  _count?: { databaseConnections: number; blogAutomations: number };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface DbConnection {
  id: string;
  name: string;
  dbType: 'POSTGRES' | 'MYSQL';
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  blogTable: string;
  fieldMapping: Record<string, string>;
  isActive: boolean;
  lastTestedAt?: string;
  testStatus?: string;
  testError?: string;
  createdAt: string;
}

const DEFAULT_FIELD_MAPPING = {
  title: 'title',
  slug: 'slug',
  content: 'content',
  excerpt: 'excerpt',
  featuredImage: 'featuredImage',
  imageAlt: 'imageAlt',
  tags: 'tags',
  faqs: 'faqs',
  articleSection: 'articleSection',
  structuredData: 'structuredData',
  wordCount: 'wordCount',
  readingTime: 'readingTime',
  author: 'author',
  isFeatured: 'isFeatured',
  seoTitle: 'seoTitle',
  seoDescription: 'seoDescription',
  seoKeywords: 'seoKeywords',
  canonicalUrl: 'canonicalUrl',
  isPublished: 'isPublished',
  publishedAt: 'publishedAt',
};

function ConnectionForm({
  initial,
  brandId,
  onClose,
  onSaved,
}: {
  initial?: DbConnection;
  brandId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    dbType: initial?.dbType || 'MYSQL',
    host: initial?.host || '',
    port: initial?.port?.toString() || '3306',
    database: initial?.database || '',
    username: initial?.username || '',
    password: '',
    ssl: initial?.ssl || false,
    blogTable: initial?.blogTable || 'Blog',
    fieldMapping: JSON.stringify(initial?.fieldMapping || DEFAULT_FIELD_MAPPING, null, 2),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.host || !form.database || !form.username) {
      toast.error('Please fill all required fields');
      return;
    }
    let parsedMapping: Record<string, string> = {};
    try {
      parsedMapping = JSON.parse(form.fieldMapping);
    } catch {
      toast.error('Field mapping must be valid JSON');
      return;
    }
    setSaving(true);
    try {
      const url = initial ? `/api/blogs/db-connections/${initial.id}` : '/api/blogs/db-connections';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, brandId, port: Number(form.port), fieldMapping: parsedMapping }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(initial ? 'Connection updated' : 'Connection added');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Connection Name *</Label>
          <Input placeholder="My Portal DB" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>DB Type *</Label>
          <Select value={form.dbType} onValueChange={v => { set('dbType', v); set('port', v === 'POSTGRES' ? '5432' : '3306'); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MYSQL">MySQL</SelectItem>
              <SelectItem value="POSTGRES">PostgreSQL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Port *</Label>
          <Input type="number" value={form.port} onChange={e => set('port', e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Host *</Label>
          <Input placeholder="db.example.com" value={form.host} onChange={e => set('host', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Database Name *</Label>
          <Input placeholder="my_portal_db" value={form.database} onChange={e => set('database', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Blog Table Name *</Label>
          <Input placeholder="Blog" value={form.blogTable} onChange={e => set('blogTable', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Username *</Label>
          <Input value={form.username} onChange={e => set('username', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Password {initial ? '(leave blank to keep)' : '*'}</Label>
          <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.ssl} onCheckedChange={v => set('ssl', v)} />
          <Label>Use SSL</Label>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Field Mapping (JSON)</Label>
          <p className="text-xs text-muted-foreground">Maps DMA fields → your portal DB columns</p>
          <textarea
            className="w-full h-40 text-xs font-mono p-2 border rounded-md bg-muted"
            value={form.fieldMapping}
            onChange={e => set('fieldMapping', e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : initial ? 'Update' : 'Add Connection'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function DbConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdFromUrl = searchParams.get('brandId') || '';

  const { data: brandsData, isLoading: loadingBrands } = useSWR('/api/brands', fetcher);
  const brands: Brand[] = brandsData?.data || [];

  const [brandId, setBrandId] = useState(brandIdFromUrl);

  useEffect(() => {
    if (brandIdFromUrl) setBrandId(brandIdFromUrl);
    else if (brands.length > 0 && !brandId) setBrandId('');
  }, [brandIdFromUrl, brands]);

  const swrKey = brandId ? `/api/blogs/db-connections?brandId=${brandId}` : null;
  const { data, isLoading } = useSWR(swrKey, fetcher);
  const connections: DbConnection[] = data?.connections || [];

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbConnection | undefined>();
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = () => mutate(swrKey);

  const selectedBrand = brands.find(b => b.id === brandId);

  const handleSelectBrand = (id: string) => {
    setBrandId(id);
    router.push(`/blogs/db-connections?brandId=${id}`);
  };

  const handleTest = async (conn: DbConnection) => {
    setTesting(conn.id);
    try {
      const res = await fetch(`/api/blogs/db-connections/${conn.id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success('Connection successful!');
      else toast.error(`Connection failed: ${data.error}`);
      refresh();
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/blogs/db-connections/${id}`, { method: 'DELETE' });
      toast.success('Connection removed');
      refresh();
    } finally {
      setDeleting(null);
    }
  };

  // Show brand selector if no brand selected
  if (!brandId) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Database Connections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Select a brand to manage its database connections</p>
        </div>
        {loadingBrands ? (
          <div className="text-muted-foreground">Loading brands...</div>
        ) : brands.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No brands found. Create a brand first.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {brands.map(brand => {
              const dbCount = brand._count?.databaseConnections ?? 0;
              const postCount = brand._count?.blogAutomations ?? 0;
              const isConnected = dbCount > 0;
              return (
                <Card key={brand.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all" onClick={() => handleSelectBrand(brand.id)}>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {brand.logo ? (
                        <img src={brand.logo} alt={brand.name} className="w-12 h-12 rounded-full border-2 border-border object-contain flex-shrink-0 p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-primary">{brand.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{brand.name}</p>
                          {isConnected && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Database className="w-3 h-3" />
                          {isConnected ? `${dbCount} connection${dbCount > 1 ? 's' : ''}` : 'No connections'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {postCount} post{postCount !== 1 ? 's' : ''}
                      </span>
                      {postCount > 0 && (
                        <button
                          className="text-xs text-primary hover:underline font-medium"
                          onClick={e => { e.stopPropagation(); router.push(`/blogs/automation?brandId=${brand.id}`); }}
                        >
                          View Posts →
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => { setBrandId(''); router.push('/blogs/db-connections'); }} className="-ml-2 mb-3">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Brands
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {selectedBrand?.logo ? (
              <img src={selectedBrand.logo} alt={selectedBrand.name} className="w-9 h-9 rounded-full border-2 border-border object-contain p-1" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">{selectedBrand?.name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> DB Connections
              </h1>
              <p className="text-sm text-muted-foreground">{selectedBrand?.name} — Connect Postgres/MySQL to publish blogs directly</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Connection
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <Database className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No database connections yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <Card key={conn.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{conn.name}</h3>
                      <Badge variant={conn.dbType === 'POSTGRES' ? 'default' : 'secondary'}>{conn.dbType}</Badge>
                      {conn.testStatus === 'SUCCESS' && (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      )}
                      {conn.testStatus === 'FAILED' && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                      {!conn.testStatus && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" /> Not tested
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {conn.username}@{conn.host}:{conn.port}/{conn.database} → table: <code className="text-xs bg-muted px-1 rounded">{conn.blogTable}</code>
                    </p>
                    {conn.testError && (
                      <p className="text-xs text-red-500 mt-1 truncate">{conn.testError}</p>
                    )}
                    {conn.lastTestedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">Last tested: {formatDate(conn.lastTestedAt)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleTest(conn)} disabled={testing === conn.id}>
                      <TestTube className="w-4 h-4 mr-1" />
                      {testing === conn.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(conn); setShowForm(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleDelete(conn.id)} disabled={deleting === conn.id}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(undefined); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Connection' : 'Add Database Connection'}</DialogTitle>
            <DialogDescription>Connect your portal's database to enable direct blog publishing</DialogDescription>
          </DialogHeader>
          <ConnectionForm
            initial={editing}
            brandId={brandId}
            onClose={() => { setShowForm(false); setEditing(undefined); }}
            onSaved={() => { setShowForm(false); setEditing(undefined); refresh(); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
