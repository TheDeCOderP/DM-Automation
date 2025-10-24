'use client';

import { useState, useEffect } from 'react';
import BannerForm from '@/components/BannerForm';
import BannerTable from '@/components/BannerTable';

interface Banner {
  id: string;
  title: string;
  type: string;
  imageUrl: string;
  redirectUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/banners');
      const data = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSuccess = () => {
    fetchBanners();
    setEditingBanner(null);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const handleCancel = () => {
    setEditingBanner(null);
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          Banner Management System
        </h1>

        <BannerForm
          editingBanner={editingBanner}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading banners...</p>
          </div>
        ) : (
          <BannerTable
            banners={banners}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  );
}