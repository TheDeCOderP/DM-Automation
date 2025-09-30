// components/ZohoWorkDrivePicker.tsx
"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, FileIcon, Folder, Download, ChevronLeft, Image, Video } from "lucide-react";

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
}

export default function ZohoWorkDrivePicker({ 
  onFileSelect, 
  allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm']
}: ZohoWorkDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [files, setFiles] = useState<ZohoFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState('');
  const [currentFolder, setCurrentFolder] = useState('shared');
  const [folderPath, setFolderPath] = useState([{ id: 'shared', name: 'Shared Files' }]);

  // Check connection status and fetch token
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/api/accounts/zoho/workdrive");
        
        if (res.ok) {
          const data = await res.json();
          console.log("Zoho connection data:", data);
          setIsConnected(true);
          setAccessToken(data.account.accessToken);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking Zoho connection:", error);
        setIsConnected(false);
      }
    }

    fetchToken();
  }, []);

  const fetchFiles = async (folderId = 'shared') => {
    setLoadingFiles(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        includeShared: 'true',
        shareType: 'incoming'
      });
      
      if (folderId !== 'shared') {
        params.append('folderId', folderId);
      }

      const response = await fetch(`/api/accounts/zoho/workdrive/files?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch files');
      }

      if (data.success) {
        let filteredFiles = data.files || [];
        
        // Filter files by allowed MIME types when not in root/shared view
        if (folderId !== 'shared') {
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
    }
  };

  const downloadFileFromWorkDrive = async (file: ZohoFile) => {
    setIsLoading(true);
    try {
      if (!file.download_url) {
        throw new Error('No download URL available for this file');
      }
      console.log("Using access token:", accessToken);
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Get the file extension from name or use default
      const fileExtension = getFileExtension(file.name);
      const fileName = file.name.includes('.') ? file.name : `${file.name}.${fileExtension}`;
      
      // Use Zoho-oauthtoken header for Zoho API
      const response = await fetch(file.download_url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please reconnect your Zoho account.');
        }
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Determine MIME type from extension if not provided
      let mimeType = file.mime_type;
      if (!mimeType) {
        mimeType = getMimeTypeFromExtension(fileExtension);
      }
      
      const downloadedFile = new File([blob], fileName, { type: mimeType });
      onFileSelect(downloadedFile);
      setIsPickerOpen(false);
      toast.success("File imported successfully from Zoho WorkDrive");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file from Zoho WorkDrive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    try {
      window.location.href = `/api/accounts/zoho/workdrive/auth`;
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Failed to initiate connection");
    }
  }

  const handleFileClick = async (file: ZohoFile) => {
    if (file.is_folder) {
      // Navigate to folder
      setCurrentFolder(file.id);
      setFolderPath([...folderPath, { id: file.id, name: file.name }]);
      await fetchFiles(file.id);
    } else {
      // Download and select the file
      await downloadFileFromWorkDrive(file);
    }
  };

  const navigateToFolder = (folderId: string, folderIndex: number) => {
    const newPath = folderPath.slice(0, folderIndex + 1);
    setFolderPath(newPath);
    setCurrentFolder(folderId);
    fetchFiles(folderId);
  };

  const handleBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      const previousFolder = newPath[newPath.length - 1];
      setFolderPath(newPath);
      setCurrentFolder(previousFolder.id);
      fetchFiles(previousFolder.id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString; // Return original string if date parsing fails
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
      return <Folder className="w-5 h-5 text-blue-500" />;
    }
    
    const extension = getFileExtension(file.name);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return <Image className="w-5 h-5 text-green-500" />;
    }
    
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return <Video className="w-5 h-5 text-purple-500" />;
    }
    
    return <FileIcon className="w-5 h-5 text-gray-500" />;
  };

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
    setFiles([]);
    setCurrentFolder('shared');
    setFolderPath([{ id: 'shared', name: 'Shared Files' }]);
    setError('');
    
    if (isConnected) {
      fetchFiles('shared');
    }
  };

  const isFileSelectable = (file: ZohoFile) => {
    if (file.is_folder) return true;
    
    const extension = getFileExtension(file.name);
    return allowedMimeTypes.some(type => 
      type.includes(extension) || 
      (file.mime_type && file.mime_type.includes(type.split('/')[1]))
    );
  };

  const getFileType = (file: ZohoFile) => {
    if (file.is_folder) return 'Folder';
    
    const extension = getFileExtension(file.name);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'Image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'Video';
    return extension.toUpperCase() || 'File';
  };

  return (
    <>
      {isConnected ? (
        <Button
          size={"lg"}
          variant="outline"
          onClick={handleOpenPicker}
          disabled={isLoading}
          className="flex items-center gap-2 bg-transparent"
        >
          {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
          {isLoading ? "Importing..." : "Import from Zoho WorkDrive"}
        </Button>
      ) : (
        <Button
          size={"lg"}
          variant="outline"
          onClick={handleConnect}
          className="flex items-center gap-2 bg-transparent"
        >
          {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
          Connect to Zoho WorkDrive
        </Button>
      )}

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
              Select File from Zoho WorkDrive
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {folderPath.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  {folderPath.map((folder, index) => (
                    <div key={folder.id} className="flex items-center gap-1">
                      <button
                        onClick={() => navigateToFolder(folder.id, index)}
                        className={`hover:text-blue-600 hover:underline truncate max-w-[120px] ${
                          index === folderPath.length - 1 ? 'font-medium text-gray-800' : ''
                        }`}
                      >
                        {folder.name}
                      </button>
                      {index < folderPath.length - 1 && <span>/</span>}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => fetchFiles(currentFolder)}
                disabled={loadingFiles}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Files Content */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2">
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-4 p-3 border border-gray-200 rounded-lg transition-colors group ${
                          isFileSelectable(file) 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isFileSelectable(file) && handleFileClick(file)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file)}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate font-medium text-gray-800">
                              {file.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {getFileType(file)}
                              </span>
                              {file.is_shared && (
                                <Badge variant="secondary" className="text-xs">
                                  Shared
                                </Badge>
                              )}
                              {file.share_direction === 'incoming' && (
                                <Badge variant="outline" className="text-xs">
                                  Shared with you
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="w-20 text-right">
                            {file.is_folder ? '-' : formatFileSize(file.size)}
                          </span>
                          
                          <span className="w-24 text-right">
                            {formatDate(file.modified_time)}
                          </span>

                          {!file.is_folder && file.download_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFileFromWorkDrive(file);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={!isFileSelectable(file)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loadingFiles ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3">
                        <Skeleton className="w-5 h-5 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {currentFolder === 'shared' 
                        ? 'No shared files found' 
                        : 'No files found in this folder'
                      }
                    </p>
                    <Button onClick={() => fetchFiles(currentFolder)}>
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer Info */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                {files.length > 0 ? (
                  <>
                    {files.length} items
                    {files.some(f => f.is_shared) && (
                      <span className="ml-2">
                        • {files.filter(f => f.is_shared).length} shared
                      </span>
                    )}
                  </>
                ) : (
                  'No files to display'
                )}
              </div>
              
              <div className="text-xs text-gray-400">
                Supported: Images & Videos
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}