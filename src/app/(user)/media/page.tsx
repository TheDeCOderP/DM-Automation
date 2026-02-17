"use client";

import React, { useState } from 'react';
import { FileIcon } from 'lucide-react';
import ZohoWorkDrivePicker from '@/components/features/ZohoWorkDrive';
import { formatDate } from '@/utils/format';

interface MediaAsset {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadDate: Date;
  source: 'zoho' | 'upload';
}

export default function MediaPage() {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const handleFileSelect = async (file: File) => {
    try {
      const previewUrl = URL.createObjectURL(file);
      
      const newAsset: MediaAsset = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: previewUrl,
        uploadDate: new Date(),
        source: 'zoho'
      };
      
      setMediaAssets(prev => [newAsset, ...prev]);
      console.log('File imported successfully:', file.name);
      
    } catch (error) {
      console.error('Error handling selected file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Media Library</h1>
        <p className="text-gray-600 mt-2">Manage your images, videos, and other media files</p>
      </div>

      {/* Zoho WorkDrive Picker - Inline Version */}
      <div className="space-y-4">
        <ZohoWorkDrivePicker 
          onFileSelect={handleFileSelect}
          variant="inline"
          showHeader={true}
        />
      </div>

      {/* Media Gallery */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Media Assets</h2>
        {mediaAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mediaAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <div className="aspect-square bg-gray-50 relative">
                  {asset.type.startsWith('image/') ? (
                    <img 
                      src={asset.url} 
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : asset.type.startsWith('video/') ? (
                    <video className="w-full h-full object-cover">
                      <source src={asset.url} type={asset.type} />
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <FileIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Zoho
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>{formatFileSize(asset.size)}</span>
                    <span>{formatDate(asset.uploadDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No media assets yet</h3>
            <p className="text-gray-500">Import files from Zoho WorkDrive using the browser above</p>
          </div>
        )}
      </div>
    </div>
  );
}