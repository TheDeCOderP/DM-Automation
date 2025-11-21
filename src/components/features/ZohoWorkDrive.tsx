"use client";

import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getPlatformIcon } from "@/utils/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { RefreshCw, File as FileIcon, Folder, Download, ChevronLeft, ChevronRight, Video, Search, Home, FileImage, X } from 'lucide-react';

interface ZohoFile {
  id: string;
  name: string;
  type: string;
  is_folder: boolean;
  size: number;
  mime_type: string;
  created_time: string;
  modified_time: string;
  download_url?: string;
  thumbnail_url?: string;
  extension?: string;
  parent_id?: string;
  is_shared?: boolean;
  share_direction?: string;
  shared_by?: string;
}

interface ZohoWorkDrivePickerProps {
  onFileSelect: (file: File) => void;
  allowedMimeTypes?: string[];
  variant?: 'popup' | 'inline';
  showHeader?: boolean;
}

interface FolderItem {
  id: string;
  name: string;
}

export default function ZohoWorkDrivePicker({ 
  onFileSelect, 
  allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'],
  variant = 'popup',
  showHeader = true
}: ZohoWorkDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [files, setFiles] = useState<ZohoFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState('');
  const [currentFolder, setCurrentFolder] = useState('shared');
  const [folderPath, setFolderPath] = useState<FolderItem[]>([{ id: 'shared', name: 'Shared Files' }]);
  const [navigationInProgress, setNavigationInProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/accounts/zoho/workdrive");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.isConnected);
        }
      } catch (error) {
        console.error("Error checking Zoho connection:", error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkConnection();
  }, []);

  useEffect(() => {
    if (variant === 'inline' && isConnected) {
      setIsPickerOpen(true);
      fetchFiles('shared');
    }
  }, [variant, isConnected]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '';
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getMimeTypeFromExtension = (extension: string) => {
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'webm': 'video/webm',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const getFileIcon = (file: ZohoFile) => {
    if (file.is_folder) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path fill="#FFA000" d="M40,12H22l-4-4H8c-2.2,0-4,1.8-4,4v8h40v-4C44,13.8,42.2,12,40,12z"/>
          <path fill="#FFCA28" d="M40,12H8c-2.2,0-4,1.8-4,4v20c0,2.2,1.8,4,4,4h32c2.2,0,4-1.8,4-4V16C44,13.8,42.2,12,40,12z"/>
        </svg>
      );
    }
    
    const extension = getFileExtension(file.name);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return (
        <div className="w-full h-full bg-blue-50 rounded flex items-center justify-center">
          <FileImage className="w-6 h-6 text-blue-500" />
        </div>
      );
    }
    
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return (
        <div className="w-full h-full bg-purple-50 rounded flex items-center justify-center">
          <Video className="w-6 h-6 text-purple-500" />
        </div>
      );
    }
    
    return (
      <div className="w-full h-full bg-gray-50 rounded flex items-center justify-center">
        <FileIcon className="w-6 h-6 text-gray-400" />
      </div>
    );
  };

  const isFileSelectable = (file: ZohoFile) => {
    if (file.is_folder) return true;
    
    const extension = getFileExtension(file.name);
    return allowedMimeTypes.some(type => 
      type.includes(extension) || 
      (file.mime_type && file.mime_type.includes(type.split('/')[1]))
    );
  };

  const fetchFiles = useCallback(async (folderId = 'shared') => {
    setLoadingFiles(true);
    setError('');
    setNavigationInProgress(true);
    setFiles([]);
    
    try {
      const params = new URLSearchParams({
        includeShared: folderId === 'shared' ? 'true' : 'false',
        shareType: 'incoming'
      });
      
      if (folderId !== 'shared') {
        params.append('folderId', folderId);
      }

      const response = await fetch(`/api/accounts/zoho/workdrive/files?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }

      const data = await response.json();

      if (data.success) {
        let filteredFiles = data.files || [];
        
        if (folderId !== 'shared') {
          filteredFiles = filteredFiles.filter((file: ZohoFile) => {
            if (file.parent_id === folderId) return true;
            if (file.is_folder && file.is_shared && (!file.parent_id || file.parent_id === '')) return true;
            if (!file.parent_id && file.id !== folderId) return false;
            return false;
          });
          
          filteredFiles = filteredFiles.filter((file: ZohoFile) => 
            file.is_folder || !file.mime_type || allowedMimeTypes.some(type => 
              file.mime_type.includes(type) || 
              (file.mime_type === '' && getFileExtension(file.name).match(/(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)/i))
            )
          );
        }
        
        setFiles(filteredFiles);
        setCurrentFolder(folderId);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Fetch files error:', error);
      setError('Failed to load files');
      setFiles([]);
    } finally {
      setLoadingFiles(false);
      setNavigationInProgress(false);
    }
  }, [allowedMimeTypes]);

  const downloadFileFromWorkDrive = async (file: ZohoFile) => {
    setIsLoading(true);
    try {
      if (!file.id) {
        throw new Error('File ID is required');
      }

      const response = await fetch(`/api/accounts/zoho/workdrive/files/download?fileId=${file.id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = file.name;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          fileName = filenameMatch[1];
        }
      }

      const fileExtension = getFileExtension(fileName);
      if (!fileExtension && file.extension) {
        fileName = `${fileName}.${file.extension}`;
      }

      let mimeType = file.mime_type;
      if (!mimeType) {
        mimeType = getMimeTypeFromExtension(getFileExtension(fileName));
      }

      const downloadedFile = new Blob([blob], { type: mimeType });
      onFileSelect(new File([downloadedFile], fileName));
      
      if (variant === 'popup') {
        setIsPickerOpen(false);
      }
      
      toast.success("File imported successfully from Zoho WorkDrive");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download file from Zoho WorkDrive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (file: ZohoFile) => {
    if (file.is_folder) {
      setFiles([]);
      const newPath = [...folderPath, { id: file.id, name: file.name }];
      setFolderPath(newPath);
      setCurrentFolder(file.id);
      await fetchFiles(file.id);
    } else {
      await downloadFileFromWorkDrive(file);
    }
  };

  const navigateToFolder = async (folderId: string, folderIndex: number) => {
    if (navigationInProgress) return;
    
    setFiles([]);
    const newPath = folderPath.slice(0, folderIndex + 1);
    setFolderPath(newPath);
    setCurrentFolder(folderId);
    await fetchFiles(folderId);
  };

  const handleBack = async () => {
    if (folderPath.length > 1 && !navigationInProgress) {
      setFiles([]);
      const newPath = folderPath.slice(0, -1);
      const previousFolder = newPath[newPath.length - 1];
      setFolderPath(newPath);
      setCurrentFolder(previousFolder.id);
      await fetchFiles(previousFolder.id);
    }
  };

  const handleHome = async () => {
    if (navigationInProgress) return;
    setFiles([]);
    setCurrentFolder('shared');
    setFolderPath([{ id: 'shared', name: 'Shared Files' }]);
    await fetchFiles('shared');
  };

  const handleRefresh = async () => {
    if (navigationInProgress) return;
    setFiles([]);
    await fetchFiles(currentFolder);
  };

  const handleConnect = () => {
    try {
      window.location.href = `/api/accounts/zoho/workdrive/auth`;
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Failed to initiate connection");
    }
  }

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
    setFiles([]);
    setCurrentFolder('shared');
    setFolderPath([{ id: 'shared', name: 'Shared Files' }]);
    setError('');
    setNavigationInProgress(false);
    setSearchQuery("");
    
    if (isConnected) {
      fetchFiles('shared');
    }
  };

  const showLoadingState = loadingFiles || navigationInProgress;
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileBrowserContent = (
    <div className="flex flex-col h-full bg-white">
      {showHeader && (
        <div className="flex flex-col gap-2 p-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={navigationInProgress || folderPath.length <= 1}
              title="Back"
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHome}
              disabled={navigationInProgress || currentFolder === 'shared'}
              title="Home"
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={navigationInProgress}
              title="Refresh"
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${navigationInProgress ? 'animate-spin' : ''}`} />
            </Button>

            <div className="flex-1 px-3 py-1.5 bg-white rounded border border-gray-300 hover:border-blue-500 focus-within:border-blue-500 transition-colors">
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {folderPath.map((folder, index) => (
                  <div key={folder.id} className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => navigateToFolder(folder.id, index)}
                      disabled={navigationInProgress || index === folderPath.length - 1}
                      className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap transition-colors ${
                        index === folderPath.length - 1 
                          ? 'text-gray-900 font-medium' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      } ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {folder.name}
                    </button>
                    {index < folderPath.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          <div className="flex items-start justify-between gap-2">
            <span><strong>Error:</strong> {error}</span>
            <Button 
              onClick={handleRefresh} 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {showLoadingState ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="w-full aspect-square rounded" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex flex-col items-center cursor-pointer group ${
                    isFileSelectable(file) ? '' : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isFileSelectable(file) && !navigationInProgress && handleFileClick(file)}
                  onMouseEnter={() => setHoveredFile(file.id)}
                  onMouseLeave={() => setHoveredFile(null)}
                >
                  <div className={`w-full aspect-square rounded p-2 transition-all ${
                    hoveredFile === file.id 
                      ? 'bg-blue-50 border-2 border-blue-400' 
                      : 'bg-transparent border-2 border-transparent hover:bg-gray-50'
                  }`}>
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  </div>
                  
                  <div className="w-full mt-1 px-1">
                    <div className={`text-xs text-center break-words line-clamp-2 leading-tight px-1 py-0.5 rounded ${
                      hoveredFile === file.id ? 'bg-blue-500 text-white' : 'text-gray-700'
                    }`}>
                      {file.name}
                    </div>
                    {!file.is_folder && file.size > 0 && (
                      <div className="text-[10px] text-gray-500 text-center mt-0.5">
                        {formatFileSize(file.size)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <Folder className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3 text-sm font-medium">
              {searchQuery
                ? "No files match your search"
                : currentFolder === "shared"
                ? "No shared files found"
                : "This folder is empty"}
            </p>
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between px-4 py-2 border-t bg-white text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>
            {!showLoadingState && filteredFiles.length > 0 
              ? `${filteredFiles.length} item${filteredFiles.length !== 1 ? 's' : ''}`
              : showLoadingState 
              ? 'Loading...'
              : 'No items'}
          </span>
        </div>
      </div>
    </div>
  );

  if (variant === 'inline') {
    if (!isConnected) {
      return (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-white">
          <div className="flex flex-col items-center gap-4">
            {getPlatformIcon("ZOHO_WORKDRIVE", "h-12 w-12 text-gray-400")}
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Connect Zoho WorkDrive</h3>
              <p className="text-gray-600 text-sm mt-2">Import files from your Zoho WorkDrive account</p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
              Connect Account
            </Button>
          </div>
        </div>
      );
    }

    return isPickerOpen ? (
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden h-[600px]">
        {fileBrowserContent}
      </div>
    ) : (
      <Button
        onClick={handleOpenPicker}
        variant="outline"
        className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
      >
        {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
        Browse Files
      </Button>
    );
  }

  return (
    <>
      {isConnected ? (
        <Button
          size="lg"
          variant="outline"
          onClick={handleOpenPicker}
          disabled={isLoading}
          className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
        >
          {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          disabled={isLoading}
          onClick={handleConnect}
          className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
        >
          {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
        </Button>
      )}

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-white">
            <DialogTitle className="flex items-center gap-3 text-lg">
              {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
              Zoho WorkDrive
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Browse and select files from your Zoho WorkDrive
            </DialogDescription>
          </DialogHeader>
          
          {fileBrowserContent}
        </DialogContent>
      </Dialog>
    </>
  );
}