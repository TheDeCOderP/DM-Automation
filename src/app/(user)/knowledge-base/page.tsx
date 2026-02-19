"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Plus, Link as LinkIcon, FileText, Image as ImageIcon, Video, StickyNote, Search, Filter, Trash2, ExternalLink, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ZohoWorkDrivePicker from '@/components/features/ZohoWorkDrive';
import {
  getKnowledgeBaseItems,
  createKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
  uploadKnowledgeBaseFile,
} from '@/actions/knowledge-base.actions';


type ItemType = 'LINK' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NOTE';

interface KnowledgeBaseItem {
  id: string;
  title: string;
  description?: string | null;
  type: ItemType;
  url?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  thumbnail?: string | null;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ItemType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showZohoPicker, setShowZohoPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'LINK' as ItemType,
    url: '',
    tags: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const result = await getKnowledgeBaseItems();
      if (result.success && result.items) {
        // Transform the items to match the expected type
        const transformedItems = result.items.map(item => ({
          ...item,
          tags: Array.isArray(item.tags) 
            ? item.tags.filter((tag): tag is string => typeof tag === 'string')
            : undefined,
        }));
        setItems(transformedItems);
      } else {
        toast.error(result.error || 'Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      try {
        // If there's a file, upload it
        if (formData.file) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', formData.file);
          uploadFormData.append('title', formData.title);
          uploadFormData.append('description', formData.description);
          uploadFormData.append('type', formData.type);

          const result = await uploadKnowledgeBaseFile(uploadFormData);

          if (result.success) {
            toast.success('Item added to knowledge base');
            setIsDialogOpen(false);
            setFormData({ title: '', description: '', type: 'LINK', url: '', tags: '', file: null });
            fetchItems();
          } else {
            toast.error(result.error || 'Failed to add item');
          }
        } else {
          // Otherwise, create a link/note item
          const payload = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          };

          const result = await createKnowledgeBaseItem(payload);

          if (result.success) {
            toast.success('Item added to knowledge base');
            setIsDialogOpen(false);
            setFormData({ title: '', description: '', type: 'LINK', url: '', tags: '', file: null });
            fetchItems();
          } else {
            toast.error(result.error || 'Failed to add item');
          }
        }
      } catch (error) {
        toast.error('Failed to add item');
      }
    });
  };

  const handleFileSelect = async (file: File) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        
        let type: ItemType = 'DOCUMENT';
        if (file.type.startsWith('image/')) type = 'IMAGE';
        else if (file.type.startsWith('video/')) type = 'VIDEO';
        
        formData.append('type', type);

        const result = await uploadKnowledgeBaseFile(formData);

        if (result.success) {
          toast.success('File uploaded successfully');
          setShowZohoPicker(false);
          fetchItems();
        } else {
          toast.error(result.error || 'Failed to upload file');
        }
      } catch (error) {
        toast.error('Upload failed');
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    startTransition(async () => {
      try {
        const result = await deleteKnowledgeBaseItem(id);

        if (result.success) {
          toast.success('Item deleted');
          fetchItems();
        } else {
          toast.error(result.error || 'Failed to delete item');
        }
      } catch (error) {
        toast.error('Failed to delete item');
      }
    });
  };

  const getIcon = (type: ItemType) => {
    switch (type) {
      case 'LINK': return <LinkIcon className="w-5 h-5" />;
      case 'IMAGE': return <ImageIcon className="w-5 h-5" />;
      case 'DOCUMENT': return <FileText className="w-5 h-5" />;
      case 'VIDEO': return <Video className="w-5 h-5" />;
      case 'NOTE': return <StickyNote className="w-5 h-5" />;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-gray-600 mt-2">Store and organize your resources</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowZohoPicker(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Import from Zoho
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add to Knowledge Base</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as ItemType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LINK">Link</SelectItem>
                      <SelectItem value="NOTE">Note</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="DOCUMENT">Document</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                {(formData.type === 'IMAGE' || formData.type === 'DOCUMENT' || formData.type === 'VIDEO') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload File</label>
                    <Input
                      type="file"
                      accept={
                        formData.type === 'IMAGE' ? 'image/*' :
                        formData.type === 'VIDEO' ? 'video/*' :
                        '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, file, title: formData.title || file.name });
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Or provide a URL below</p>
                  </div>
                )}
                {formData.type !== 'NOTE' && !formData.file && (
                  <div>
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <Input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required={!formData.file}
                    />
                  </div>
                )}
                {formData.type === 'LINK' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <Input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="design, reference, tutorial"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        <Select value={filterType} onValueChange={(value) => setFilterType(value as ItemType | 'ALL')}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="LINK">Links</SelectItem>
            <SelectItem value="IMAGE">Images</SelectItem>
            <SelectItem value="DOCUMENT">Documents</SelectItem>
            <SelectItem value="VIDEO">Videos</SelectItem>
            <SelectItem value="NOTE">Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredItems.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getIcon(item.type)}
                      <Badge variant="secondary">{item.type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {(item.url || item.fileUrl) && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={item.url || item.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-32 object-cover rounded mb-3" />
                  )}
                  <h3 className="font-semibold mb-1 line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getIcon(item.type)}
                        <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {item.thumbnail && (
                          <img src={item.thumbnail} alt={item.title} className="w-10 h-10 object-cover rounded" />
                        )}
                        <span className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                      <p className="line-clamp-2">{item.description || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      {item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{item.tags.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-1">
                        {(item.url || item.fileUrl) && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.url || item.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500">Start building your knowledge base by adding resources</p>
        </div>
      )}

      {showZohoPicker && (
        <Dialog open={showZohoPicker} onOpenChange={setShowZohoPicker}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Import from Zoho WorkDrive</DialogTitle>
            </DialogHeader>
            <ZohoWorkDrivePicker onFileSelect={handleFileSelect} variant="inline" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
