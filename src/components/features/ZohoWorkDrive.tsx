// components/ZohoWorkDrivePicker.tsx
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
import { 
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  FileIcon, 
  Folder, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Image, 
  Video,
  Search,
  Home
} from "lucide-react";

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

interface FolderItem {
  id: string;
  name: string;
}

export default function ZohoWorkDrivePicker({ 
  onFileSelect, 
  allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm']
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

  // Check connection status
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

  // Filter files based on search query
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Use useCallback to prevent unnecessary recreations of fetchFiles
  const fetchFiles = useCallback(async (folderId = 'shared') => {
    setLoadingFiles(true);
    setError('');
    setNavigationInProgress(true);
    
    // Clear files immediately when starting to load new folder
    setFiles([]);
    
    try {
      const params = new URLSearchParams({
        // Only include shared files when in the root 'shared' folder
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
        
        // When in a specific folder, filter to only show files that belong to this folder
        if (folderId !== 'shared') {
          filteredFiles = filteredFiles.filter((file: ZohoFile) => {
            // Keep files that are directly in this folder
            if (file.parent_id === folderId) return true;
            
            // Keep shared folders that are at root level for navigation
            if (file.is_folder && file.is_shared && (!file.parent_id || file.parent_id === '')) return true;
            
            // For files in shared view that don't have parent_id set but are in current folder context
            if (!file.parent_id && file.id !== folderId) return false;
            
            return false;
          });
          
          // Also filter by MIME types for non-folder files
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

      const downloadedFile = new File([blob], fileName, { type: mimeType });
      onFileSelect(downloadedFile);
      setIsPickerOpen(false);
      toast.success("File imported successfully from Zoho WorkDrive");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download file from Zoho WorkDrive");
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
      // Use a more direct approach for folder navigation
      setFiles([]); // Clear files immediately
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
    
    setFiles([]); // Clear files immediately
    const newPath = folderPath.slice(0, folderIndex + 1);
    setFolderPath(newPath);
    setCurrentFolder(folderId);
    await fetchFiles(folderId);
  };

  const handleBack = async () => {
    if (folderPath.length > 1 && !navigationInProgress) {
      setFiles([]); // Clear files immediately
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
    setFiles([]); // Clear files immediately
    await fetchFiles(currentFolder);
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
      return <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
    
    const extension = getFileExtension(file.name);
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return <Image className="w-5 h-5 text-green-500 flex-shrink-0" />;
    }
    
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
      return <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />;
    }
    
    return <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />;
  };

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
    // Reset everything when opening picker
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

  // Show loading state when files are being loaded
  const showLoadingState = loadingFiles || navigationInProgress;

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
          disabled={isLoading}
          onClick={handleConnect}
          className="flex items-center gap-2 bg-transparent"
        >
          {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
          Connect to Zoho WorkDrive
        </Button>
      )}

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col p-0 overflow-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              {getPlatformIcon("ZOHO_WORKDRIVE", "h-5 w-5")}
              Zoho WorkDrive Files
            </DialogTitle>
            <DialogDescription className="text-sm">
              Browse and select files from your Zoho WorkDrive
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 border-b shrink-0">
              {/* Navigation Section */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHome}
                    disabled={navigationInProgress || currentFolder === 'shared'}
                    className="h-8 w-8 p-0"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    disabled={navigationInProgress || folderPath.length <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>

                {/* Breadcrumb - Horizontal Scroll */}
                <ScrollArea className="flex-1 max-w-[200px] sm:max-w-none">
                  <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                    {folderPath.map((folder, index) => (
                      <div key={folder.id} className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => navigateToFolder(folder.id, index)}
                          disabled={navigationInProgress || index === folderPath.length - 1}
                          className={`px-2 py-1 rounded text-xs sm:text-sm ${
                            index === folderPath.length - 1 
                              ? 'font-medium text-gray-800 bg-gray-100 cursor-default' 
                              : 'hover:bg-gray-100 cursor-pointer'
                          } ${navigationInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {folder.name}
                        </button>
                        {index < folderPath.length - 1 && (
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Search and Actions Section */}
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <div className="relative flex-1 sm:flex-none sm:w-48">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                <Button
                  onClick={handleRefresh}
                  disabled={navigationInProgress}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${navigationInProgress ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm shrink-0">
                <strong>Error:</strong> {error}
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Files Content - Vertical Scroll */}
            <ScrollArea className="flex-1">
              {showLoadingState ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-16 hidden sm:block flex-shrink-0" />
                      <Skeleton className="h-4 w-20 hidden lg:block flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow>
                        <TableHead className="w-[45%] sm:w-[50%]">Name</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Size</TableHead>
                        <TableHead className="hidden sm:table-cell">Modified</TableHead>
                        <TableHead className="text-right w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow
                          key={file.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => isFileSelectable(file) && !navigationInProgress && handleFileClick(file)}
                        >
                          {/* Name + Icon */}
                          <TableCell className="flex items-center gap-3">
                            {getFileIcon(file)}
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-medium text-gray-800 text-sm group-hover:text-blue-600">
                                {file.name}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{getFileType(file)}</span>
                                {file.is_shared && (
                                  <Badge variant="secondary" className="text-xs">Shared</Badge>
                                )}
                                {file.share_direction === "incoming" && (
                                  <Badge variant="outline" className="text-xs">Shared with you</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Size */}
                          <TableCell className="hidden sm:table-cell text-right text-sm text-gray-600">
                            {file.is_folder ? "-" : formatFileSize(file.size)}
                          </TableCell>

                          {/* Modified */}
                          <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                            {formatDate(file.modified_time)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            {!file.is_folder && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadFileFromWorkDrive(file)
                                }}
                                disabled={!isFileSelectable(file) || isLoading || navigationInProgress}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2 text-sm">
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
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Footer Info */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0">
              <div className="text-sm text-gray-600">
                {!showLoadingState && filteredFiles.length > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm">
                      {filteredFiles.length} of {files.length} items
                    </span>
                    {files.some(f => f.is_shared) && (
                      <span className="ml-2 hidden sm:inline">
                        • {files.filter(f => f.is_shared).length} shared
                      </span>
                    )}
                    {searchQuery && (
                      <span className="ml-2 hidden sm:inline">• Filtered by search</span>
                    )}
                  </>
                ) : showLoadingState ? (
                  <span className="text-xs sm:text-sm">Loading...</span>
                ) : (
                  <span className="text-xs sm:text-sm">No files to display</span>
                )}
              </div>
              
              <div className="text-xs text-gray-500 hidden sm:block">
                Supported: Images & Videos
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}