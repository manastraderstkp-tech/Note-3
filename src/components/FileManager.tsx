import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  FolderPlus,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Film,
  Music,
  Archive,
  File as FileIcon,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Search,
  LayoutGrid,
  List,
  HardDrive,
  Clock,
  Download,
  AlertCircle,
  Plus,
  Loader2,
  Folder as FolderIconClosed,
  Eye,
  Edit3,
  FolderUp,
  X
} from 'lucide-react';
import { Folder, UserFile } from '../types';
import { syncDownloadFile } from '../lib/supabase';
import { getLocalFileBlob } from '../lib/fileStorage';

interface FileManagerProps {
  folders: Folder[];
  files: UserFile[];
  onCreateFolder: (name: string, parentId?: string | null) => Promise<{ success: boolean; error?: string; folder?: Folder }>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onUploadFile: (folderId: string | null, file: File) => Promise<{ success: boolean; error?: string }>;
  onDeleteFile: (fileId: string, filePath: string) => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  searchQuery?: string;
}

const getFileIcon = (fileType: string, name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const type = (fileType || '').toLowerCase();

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return { icon: ImageIcon, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' };
  }
  if (type.includes('pdf') || ext === 'pdf') {
    return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };
  }
  if (type.includes('csv') || type.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext)) {
    return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
  }
  if (['json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'sql', 'md'].includes(ext)) {
    return { icon: FileCode, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800' };
  }
  if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return { icon: Film, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
  }
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return { icon: Music, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: Archive, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' };
  }
  return { icon: FileIcon, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
};

const isImageFile = (fileType: string, name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return (fileType || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
};

interface ImageFileThumbnailProps {
  file: UserFile;
  onPreview: (url: string, name: string, file: UserFile) => void;
}

const ImageFileThumbnail: React.FC<ImageFileThumbnailProps> = ({ file, onPreview }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(file.storageUrl || '');
  const [isBlobCreated, setIsBlobCreated] = useState(false);
  const fileStyle = getFileIcon(file.fileType, file.name);
  const IconComp = fileStyle.icon;

  useEffect(() => {
    let isMounted = true;
    let localBlobUrl = '';

    const checkAndResolve = async () => {
      // If we have a working non-blob HTTP url, try it first
      if (file.storageUrl && file.storageUrl.startsWith('http')) {
        setResolvedUrl(file.storageUrl);
        return;
      }

      // Check IndexedDB binary cache for offline/persisted blob
      if (file.id) {
        try {
          const blob = await getLocalFileBlob(file.id);
          if (blob && isMounted) {
            localBlobUrl = URL.createObjectURL(blob);
            setResolvedUrl(localBlobUrl);
            setIsBlobCreated(true);
            return;
          }
        } catch (e) {
          console.warn('Error loading blob for thumbnail:', e);
        }
      }

      if (file.storageUrl && isMounted) {
        setResolvedUrl(file.storageUrl);
      }
    };

    checkAndResolve();

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [file.id, file.storageUrl]);

  const handleImageError = async () => {
    // If the HTTP/Blob URL failed, try pulling from IndexedDB directly
    if (file.id && !isBlobCreated) {
      try {
        const blob = await getLocalFileBlob(file.id);
        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          setResolvedUrl(newUrl);
          setIsBlobCreated(true);
          return;
        }
      } catch {
        // ignore
      }
    }
    setResolvedUrl('');
  };

  if (!resolvedUrl) {
    return <IconComp className={`h-12 w-12 ${fileStyle.color}`} />;
  }

  return (
    <>
      <img
        src={resolvedUrl}
        alt={file.name}
        className="h-full w-full object-cover transition group-hover:scale-105"
        referrerPolicy="no-referrer"
        onError={handleImageError}
      />
      <button
        type="button"
        onClick={() => onPreview(resolvedUrl, file.name, file)}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white"
        title="Preview image"
      >
        <Eye className="h-6 w-6" />
      </button>
    </>
  );
};

export const FileManager: React.FC<FileManagerProps> = ({
  folders,
  files,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUploadFile,
  onDeleteFile,
  onShowToast,
  searchQuery = '',
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; file?: UserFile } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
    filePath?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Ensure cross-browser directory attribute support on folderInput
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
  }, []);

  // Active folder object
  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;

  // Build breadcrumbs path
  const getBreadcrumbs = () => {
    const crumbs: Folder[] = [];
    let curr = currentFolder;
    while (curr) {
      crumbs.unshift(curr);
      curr = folders.find((f) => f.id === curr?.parentId) || null;
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Child folders for the current view
  const currentFolders = folders.filter((f) => {
    if (currentFolderId === null) {
      return !f.parentId;
    }
    return f.parentId === currentFolderId;
  });

  // Child files for the current view
  const currentFiles = files.filter((f) => {
    if (currentFolderId === null) {
      return !f.folderId;
    }
    return f.folderId === currentFolderId;
  });

  // Apply search query across names
  const effectiveSearch = (searchQuery || localSearch).toLowerCase().trim();
  const filteredFolders = effectiveSearch
    ? folders.filter((f) => f.name.toLowerCase().includes(effectiveSearch))
    : currentFolders;

  const filteredFiles = effectiveSearch
    ? files.filter((f) => f.name.toLowerCase().includes(effectiveSearch))
    : currentFiles;

  // Total storage calculation
  const totalBytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate total size of files inside a folder (including nested subfolders)
  const getFolderTotalSize = (folderId: string): number => {
    const directFiles = files.filter((f) => f.folderId === folderId);
    let total = directFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0);
    const subFolders = folders.filter((f) => f.parentId === folderId);
    for (const sf of subFolders) {
      total += getFolderTotalSize(sf.id);
    }
    return total;
  };

  // Calculate total file count inside a folder (including nested subfolders)
  const getFolderTotalFilesCount = (folderId: string): number => {
    const directCount = files.filter((f) => f.folderId === folderId).length;
    const subFolders = folders.filter((f) => f.parentId === folderId);
    let total = directCount;
    for (const sf of subFolders) {
      total += getFolderTotalFilesCount(sf.id);
    }
    return total;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Handle New Folder Submission
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsSubmittingFolder(true);
    const res = await onCreateFolder(newFolderName.trim(), currentFolderId);
    setIsSubmittingFolder(false);

    if (res.success) {
      setNewFolderName('');
      setIsNewFolderOpen(false);
      onShowToast('Folder created successfully', 'success');
    } else {
      onShowToast(res.error || 'Failed to create folder', 'error');
    }
  };

  // Handle Rename/Edit Folder Submission
  const handleRenameFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !renameFolderName.trim()) return;

    setIsSubmittingRename(true);
    if (onRenameFolder) {
      const res = await onRenameFolder(editingFolder.id, renameFolderName.trim());
      setIsSubmittingRename(false);
      if (res.success) {
        setEditingFolder(null);
        setRenameFolderName('');
      } else {
        onShowToast(res.error || 'Failed to rename folder', 'error');
      }
    } else {
      setIsSubmittingRename(false);
      setEditingFolder(null);
    }
  };

  // Generic handler for files with optional nested relative directory paths
  const uploadFilesWithPaths = async (
    items: { file: File; relativePath?: string }[],
    isFolderUpload = false
  ) => {
    if (!items || items.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;

    // Cache of accumulated folder path string -> folder UUID
    const folderPathToIdMap = new Map<string, string>();

    const getOrCreateFolderForPath = async (relPath: string): Promise<string | null> => {
      const cleanPath = relPath.replace(/\\/g, '/');
      const segments = cleanPath.split('/').filter(Boolean);
      if (segments.length <= 1) {
        return currentFolderId;
      }

      // Drop the file name to get directory segments
      const folderSegments = segments.slice(0, -1);
      let parentId = currentFolderId;
      let accumulatedKey = currentFolderId || 'root';

      for (const segment of folderSegments) {
        accumulatedKey = `${accumulatedKey}/${segment.toLowerCase()}`;

        if (folderPathToIdMap.has(accumulatedKey)) {
          parentId = folderPathToIdMap.get(accumulatedKey)!;
          continue;
        }

        // Check if folder already exists in state
        const existing = folders.find(
          (f) =>
            f.name.toLowerCase() === segment.toLowerCase() &&
            (f.parentId || null) === (parentId || null)
        );

        if (existing) {
          folderPathToIdMap.set(accumulatedKey, existing.id);
          parentId = existing.id;
        } else {
          setUploadProgressText(`Creating folder "${segment}"...`);
          const res = await onCreateFolder(segment, parentId);
          if (res.success && res.folder) {
            folderPathToIdMap.set(accumulatedKey, res.folder.id);
            parentId = res.folder.id;
          } else {
            const created = folders.find(
              (f) =>
                f.name.toLowerCase() === segment.toLowerCase() &&
                (f.parentId || null) === (parentId || null)
            );
            if (created) {
              folderPathToIdMap.set(accumulatedKey, created.id);
              parentId = created.id;
            }
          }
        }
      }

      return parentId;
    };

    for (let i = 0; i < items.length; i++) {
      const { file, relativePath } = items[i];
      const displayPath = relativePath || file.name;
      setUploadProgressText(`Uploading ${i + 1} of ${items.length}: ${displayPath}`);

      try {
        let targetFolderId = currentFolderId;
        if (relativePath && (relativePath.includes('/') || relativePath.includes('\\'))) {
          targetFolderId = await getOrCreateFolderForPath(relativePath);
        }
        const res = await onUploadFile(targetFolderId, file);
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.warn('File upload exception:', err);
        failedCount++;
      }
    }

    setIsUploading(false);
    setUploadProgressText('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }

    if (failedCount === 0) {
      onShowToast(
        isFolderUpload
          ? `Successfully uploaded folder containing ${successCount} file${successCount !== 1 ? 's' : ''}`
          : `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`,
        'success'
      );
    } else {
      onShowToast(
        `Upload complete: ${successCount} uploaded, ${failedCount} failed`,
        failedCount > 0 ? 'error' : 'success'
      );
    }
  };

  // Handle Multi-file Upload
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList).map((f) => ({
      file: f,
      relativePath: (f as any).webkitRelativePath || f.name,
    }));
    await uploadFilesWithPaths(items, false);
  };

  // Handle Folder Upload
  const handleFolderSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList).map((f) => ({
      file: f,
      relativePath: (f as any).webkitRelativePath || f.name,
    }));
    await uploadFilesWithPaths(items, true);
  };

  // Drag and Drop handlers with directory traversal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Check for webkitGetAsEntry support for folders
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const parsedItems: { file: File; relativePath: string }[] = [];
      let hasDirectory = false;

      const readEntryRecursive = async (entry: any, currentPath = ''): Promise<void> => {
        if (!entry) return;
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file(
              (file: File) => {
                parsedItems.push({
                  file,
                  relativePath: currentPath ? `${currentPath}/${file.name}` : file.name,
                });
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          hasDirectory = true;
          const dirReader = entry.createReader();
          const readAllEntries = async (): Promise<any[]> => {
            let all: any[] = [];
            let batch: any[] = await new Promise((resolve) =>
              dirReader.readEntries(resolve, () => resolve([]))
            );
            while (batch.length > 0) {
              all = all.concat(batch);
              batch = await new Promise((resolve) =>
                dirReader.readEntries(resolve, () => resolve([]))
              );
            }
            return all;
          };

          const entries = await readAllEntries();
          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          for (const subEntry of entries) {
            await readEntryRecursive(subEntry, nextPath);
          }
        }
      };

      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            promises.push(readEntryRecursive(entry));
          }
        }
      }

      if (promises.length > 0) {
        setIsUploading(true);
        setUploadProgressText('Scanning dropped files and folders...');
        await Promise.all(promises);
        if (parsedItems.length > 0) {
          await uploadFilesWithPaths(parsedItems, hasDirectory);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Copy URL to Clipboard
  const handleCopyLink = (file: UserFile) => {
    if (!file.storageUrl) {
      onShowToast('No public URL available for this file', 'info');
      return;
    }
    navigator.clipboard.writeText(file.storageUrl);
    setCopiedFileId(file.id);
    onShowToast('Public URL copied to clipboard', 'success');
    setTimeout(() => setCopiedFileId(null), 2500);
  };

  // Download File Handler
  const handleDownloadFile = async (file: {
    id?: string;
    name: string;
    storageUrl?: string;
    filePath?: string;
  }) => {
    if (!file.storageUrl && !file.filePath) {
      onShowToast('No download link available for this file', 'error');
      return;
    }

    if (file.id) {
      setDownloadingFileId(file.id);
    }

    onShowToast(`Downloading "${file.name}"...`, 'info');

    try {
      const res = await syncDownloadFile(file);
      if (res.success) {
        onShowToast(`Downloaded "${file.name}"`, 'success');
      } else {
        onShowToast(res.error || `Could not download "${file.name}"`, 'error');
      }
    } catch (err: any) {
      console.error('File download failure:', err);
      // Last-ditch emergency trigger: open in new tab
      if (file.storageUrl) {
        window.open(file.storageUrl, '_blank');
        onShowToast(`Opened "${file.name}" in a new tab`, 'info');
      } else {
        onShowToast(`Download failed for "${file.name}"`, 'error');
      }
    } finally {
      if (file.id) {
        setDownloadingFileId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                File Manager & Cloud Drive
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Backed by Supabase Storage bucket & PostgreSQL tables with RLS isolation
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Storage Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/80 px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100">
            <HardDrive className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-900 dark:text-white">{formatBytes(totalBytes)}</span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-800 dark:text-slate-200">{files.length} files</span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-800 dark:text-slate-200">{folders.length} folders</span>
          </div>

          <button
            id="btn-create-new-folder"
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:hover:border-slate-600"
          >
            <FolderPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            id="btn-trigger-upload-files"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-100 hover:border-indigo-300 transition active:scale-95 disabled:opacity-50 dark:border-indigo-900/50 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            <span>Upload Files</span>
          </button>

          <button
            id="btn-trigger-upload-folder"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderUp className="h-4 w-4" />
            )}
            <span>Upload Folder</span>
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesSelected(e.target.files)}
            multiple
            className="hidden"
          />

          {/* Hidden Folder Input */}
          <input
            type="file"
            ref={folderInputRef}
            onChange={(e) => handleFolderSelected(e.target.files)}
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            className="hidden"
          />
        </div>
      </div>

      {/* Breadcrumbs Navigation & Search/View Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold text-slate-600 dark:text-slate-400">
          {currentFolderId && (
            <button
              onClick={() => {
                if (currentFolder?.parentId) {
                  setCurrentFolderId(currentFolder.parentId);
                } else {
                  setCurrentFolderId(null);
                }
              }}
              className="mr-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              title="Go back up"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              currentFolderId === null
                ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Root Drive</span>
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 whitespace-nowrap transition ${
                  idx === breadcrumbs.length - 1
                    ? 'bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                    : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <FolderIconClosed className="h-3.5 w-3.5" />
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-drive"
              type="text"
              placeholder="Search files & folders..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
            />
            {localSearch && (
              <button
                id="btn-clear-search-drive"
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              id="btn-view-mode-grid"
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              id="btn-view-mode-list"
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Search Banner */}
      {effectiveSearch && (
        <div className="flex items-center justify-between rounded-2xl bg-indigo-50/80 px-4 py-2 text-xs text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              Search results for <strong>"{effectiveSearch}"</strong>: {filteredFolders.length} folders, {filteredFiles.length} files found
            </span>
          </div>
          <button
            onClick={() => setLocalSearch('')}
            className="font-bold underline text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        id="dropzone-file-manager"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01] dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-slate-300/80 bg-white hover:border-indigo-400 hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-indigo-500 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition dark:bg-indigo-950/80 dark:text-indigo-400">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>
        <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
          {isUploading ? uploadProgressText : 'Drag and drop files or folders here, or click to browse'}
        </h3>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-lg">
          Upload individual files, nested folders with subdirectories, documents, images, or code into{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {currentFolder ? currentFolder.name : 'Root Drive'}
          </span>
        </p>

        {/* Quick Click Action Buttons Inside Dropzone */}
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            id="btn-dropzone-upload-files"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-indigo-600 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <UploadCloud className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Select Files</span>
          </button>
          <button
            type="button"
            id="btn-dropzone-upload-folder"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-indigo-600 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <FolderUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Select Folder</span>
          </button>
        </div>
      </div>

      {/* Folders Section */}
      {filteredFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Folders ({filteredFolders.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredFolders.map((folder) => {
              const childFilesCount = files.filter((f) => f.folderId === folder.id).length;
              const childFoldersCount = folders.filter((f) => f.parentId === folder.id).length;
              const folderTotalSize = getFolderTotalSize(folder.id);

              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:scale-105 transition dark:bg-amber-950/40 dark:text-amber-400">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                        {folder.name}
                      </h4>
                      <p className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatBytes(folderTotalSize)}
                        </span>
                        <span>•</span>
                        <span>
                          {childFilesCount} file{childFilesCount !== 1 ? 's' : ''}
                        </span>
                        {childFoldersCount > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {childFoldersCount} subfolder{childFoldersCount !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 ml-2">
                    <button
                      id={`btn-edit-folder-${folder.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder);
                        setRenameFolderName(folder.name);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-indigo-50 hover:text-indigo-600 transition dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
                      title="Edit / Rename folder"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      id={`btn-delete-folder-${folder.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          type: 'folder',
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      title="Delete folder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Files ({filteredFiles.length})
          </h2>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FileIcon className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              No files in this location
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Upload files or drag them into the box above to store and organize your assets.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                id="btn-empty-upload-files"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload Files</span>
              </button>
              <button
                id="btn-empty-upload-folder"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FolderUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Upload Folder</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredFiles.map((file) => {
              const fileStyle = getFileIcon(file.fileType, file.name);
              const IconComp = fileStyle.icon;
              const isImage = isImageFile(file.fileType, file.name);

              return (
                <div
                  key={file.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div>
                    {/* Image Preview / File Icon Preview Area */}
                    <div
                      className={`relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border ${fileStyle.bg}`}
                    >
                      {isImage ? (
                        <ImageFileThumbnail
                          file={file}
                          onPreview={(url, name, f) =>
                            setPreviewImage({ url, name, file: f })
                          }
                        />
                      ) : (
                        <IconComp className={`h-12 w-12 ${fileStyle.color}`} />
                      )}
                    </div>

                    {/* File Title & Details */}
                    <h4
                      className="truncate text-sm font-bold text-slate-800 dark:text-slate-200"
                      title={file.name}
                    >
                      {file.name}
                    </h4>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatBytes(file.fileSize)}</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>

                  {/* File Actions Bar */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      {file.storageUrl && (
                        <a
                          href={file.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        id={`btn-download-file-grid-${file.id}`}
                        onClick={() => handleDownloadFile(file)}
                        disabled={downloadingFileId === file.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        title="Download file"
                      >
                        {downloadingFileId === file.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyLink(file)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        title="Copy public link"
                      >
                        {copiedFileId === file.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      id={`btn-delete-file-grid-${file.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          type: 'file',
                          id: file.id,
                          name: file.name,
                          filePath: file.filePath,
                        });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      title="Delete file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List / Table View */
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-850/50 dark:text-slate-400">
                  <tr>
                    <th className="py-3 pl-4 pr-3">File Name</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Size</th>
                    <th className="px-3 py-3">Date Uploaded</th>
                    <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {/* Folders in List View */}
                  {filteredFolders.map((folder) => {
                    const childFilesCount = files.filter((f) => f.folderId === folder.id).length;
                    const folderTotalSize = getFolderTotalSize(folder.id);
                    return (
                      <tr
                        key={`list-folder-${folder.id}`}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="cursor-pointer bg-slate-50/40 hover:bg-indigo-50/60 dark:bg-slate-850/20 dark:hover:bg-indigo-950/30 transition group"
                      >
                        <td className="py-3 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                              <FolderOpen className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 truncate max-w-xs">
                              {folder.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                          folder
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-medium">
                          {formatBytes(folderTotalSize)}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {childFilesCount} file{childFilesCount !== 1 ? 's' : ''}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              id={`btn-edit-folder-list-${folder.id}`}
                              onClick={() => {
                                setEditingFolder(folder);
                                setRenameFolderName(folder.name);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
                              title="Rename folder"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-delete-folder-list-${folder.id}`}
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'folder',
                                  id: folder.id,
                                  name: folder.name,
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                              title="Delete folder"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Files in List View */}
                  {filteredFiles.map((file) => {
                    const fileStyle = getFileIcon(file.fileType, file.name);
                    const IconComp = fileStyle.icon;

                    return (
                      <tr
                        key={file.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition"
                      >
                        <td className="py-3 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${fileStyle.bg}`}>
                              <IconComp className={`h-4 w-4 ${fileStyle.color}`} />
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                          {file.fileType || 'binary'}
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-medium">
                          {formatBytes(file.fileSize)}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {file.storageUrl && (
                              <a
                                href={file.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                title="Open file"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              id={`btn-download-file-list-${file.id}`}
                              onClick={() => handleDownloadFile(file)}
                              disabled={downloadingFileId === file.id}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Download file"
                            >
                              {downloadingFileId === file.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyLink(file)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Copy URL"
                            >
                              {copiedFileId === file.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              id={`btn-delete-file-list-${file.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  type: 'file',
                                  id: file.id,
                                  name: file.name,
                                  filePath: file.filePath,
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/50"
                              title="Delete file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Folder
                </h3>
                <p className="text-xs text-slate-400">
                  Location: {currentFolder ? currentFolder.name : 'Root Drive'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Folder Name
                </label>
                <input
                  id="input-new-folder-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Design Assets, Invoices, Project Docs"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFolder || !newFolderName.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingFolder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="h-3.5 w-3.5" />
                  )}
                  <span>Create Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename / Edit Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rename Folder
                </h3>
                <p className="text-xs text-slate-400">
                  Size: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatBytes(getFolderTotalSize(editingFolder.id))}</span> • {getFolderTotalFilesCount(editingFolder.id)} total files
                </p>
              </div>
            </div>

            <form onSubmit={handleRenameFolderSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Folder Name
                </label>
                <input
                  id="input-rename-folder-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter new folder name"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-rename-folder"
                  type="submit"
                  disabled={isSubmittingRename || !renameFolderName.trim() || renameFolderName.trim() === editingFolder.name}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingRename ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold truncate max-w-md">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleDownloadFile(
                      previewImage.file || {
                        name: previewImage.name,
                        storageUrl: previewImage.url,
                      }
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                  title="Download image"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold hover:bg-slate-700 text-white"
                >
                  Close (ESC)
                </button>
              </div>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {deleteTarget.type === 'folder' ? 'Folder' : 'File'}?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{deleteTarget.name}"
                  </span>
                  ?{' '}
                  {deleteTarget.type === 'folder'
                    ? 'This will permanently delete this folder and all contents inside.'
                    : 'This action cannot be undone and will permanently remove this file.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                id="btn-cancel-delete"
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    if (deleteTarget.type === 'file') {
                      await onDeleteFile(deleteTarget.id, deleteTarget.filePath || '');
                    } else {
                      await onDeleteFolder(deleteTarget.id);
                    }
                  } catch (err: any) {
                    onShowToast(err?.message || 'Failed to delete item', 'error');
                  } finally {
                    setIsDeleting(false);
                    setDeleteTarget(null);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
