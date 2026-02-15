'use client';

import { useState, useEffect, useRef } from 'react';

type BannerType = 'Festive Ads' | 'Sidebar Ads' | 'Horizontal Ads' | 'Vertical Ads';

interface Banner {
  id?: string;
  title: string;
  type: BannerType;
  typeLabel?: string;
  imageUrl: string;
  imagePublicId?: string | null;
  redirectUrl?: string;
  isActive: boolean;
}

interface BannerFormProps {
  editingBanner: Banner | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BannerForm({ editingBanner, onSuccess, onCancel }: BannerFormProps) {
  const [formData, setFormData] = useState<Banner>({
    title: '',
    type: 'Festive Ads',
    typeLabel: 'Festive Ads',
    imageUrl: '',
    imagePublicId: null,
    redirectUrl: '',
    isActive: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (editingBanner) {
      setFormData(editingBanner);
      setPreviewUrl(editingBanner.imageUrl);
      setSelectedFile(null);
    } else {
      setFormData({
        title: '',
        type: 'Festive Ads',
        typeLabel: 'Festive Ads',
        imageUrl: '',
        imagePublicId: null,
        redirectUrl: '',
        isActive: true,
      });
      setSelectedFile(null);
      setPreviewUrl('');
    }
    setError('');
  }, [editingBanner]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError('');

    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only image files (JPEG, PNG, GIF, WebP) are allowed');
        setSelectedFile(null);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedFile && !formData.imageUrl) {
      setError('Please select a banner image');
      return;
    }

    setLoading(true);

    try {
      const url = editingBanner
        ? `/api/banners/${editingBanner.id}`
        : '/api/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const submission = new FormData();
      submission.append('title', formData.title);
      submission.append('type', formData.type);
      submission.append('typeLabel', formData.typeLabel || formData.type);
      submission.append('redirectUrl', formData.redirectUrl || '');
      submission.append('isActive', String(formData.isActive));

      if (selectedFile) {
        submission.append('file', selectedFile);
      } else if (editingBanner) {
        submission.append('imageUrl', formData.imageUrl);
        if (formData.imagePublicId) {
          submission.append('imagePublicId', formData.imagePublicId);
        }
      }

      console.log('Submitting form:', {
        title: formData.title,
        type: formData.type,
        typeLabel: formData.typeLabel,
        hasFile: !!selectedFile,
        isActive: formData.isActive
      });

      const response = await fetch(url, {
        method,
        body: submission,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Banner saved successfully:', data);
        onSuccess();
        
        // Reset form
        setFormData({
          title: '',
          type: 'Festive Ads',
          typeLabel: 'Festive Ads',
          imageUrl: '',
          imagePublicId: null,
          redirectUrl: '',
          isActive: true,
        });
        if (formRef.current) {
          formRef.current.reset();
        }
        setSelectedFile(null);
        setPreviewUrl('');
      } else {
        console.error('Server error:', data);
        setError(data.error || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error as string || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow mb-8"
    >
      <h2 className="text-2xl font-bold mb-4">
        {editingBanner ? 'Edit Banner' : 'Add New Banner'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="banner-title" className="block text-sm font-medium mb-1">Title *</label>
          <input
            id="banner-title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter banner title"
          />
        </div>

        <div>
          <label htmlFor="banner-type" className="block text-sm font-medium mb-1">Type *</label>
          <select
            id="banner-type"
            required
            value={formData.type}
            onChange={(e) => {
              const selectedType = e.target.value as BannerType;
              setFormData({ 
                ...formData, 
                type: selectedType,
                typeLabel: selectedType
              });
            }}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Festive Ads">Festive Ads</option>
            <option value="Sidebar Ads">Sidebar Ads</option>
            <option value="Horizontal Ads">Horizontal Ads</option>
            <option value="Vertical Ads">Vertical Ads</option>
          </select>
        </div>

        <div>
          <label htmlFor="banner-image" className="block text-sm font-medium mb-1">
            Banner Image * {!editingBanner && '(Max 10MB)'}
          </label>
          <input
            id="banner-image"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            required={!editingBanner}
            onChange={handleFileChange}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Banner preview"
              className="mt-2 h-24 w-40 object-cover rounded border"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Redirect URL</label>
          <input
            type="url"
            value={formData.redirectUrl}
            onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm font-medium">Active</span>
        </label>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Add Banner'}
        </button>
        {editingBanner && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}