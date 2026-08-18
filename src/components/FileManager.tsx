import React, { useState, useRef } from 'react';
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
  Eye
} from 'lucide-react';
import { Folder, UserFile } from '../types';

interface FileManagerProps {
  folders: Folder[];
  files: UserFile[];
  onCreateFolder: (name: string, parentId?: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onUploadFile: (folderId: string | null, file: File) => Promise<{ success: boolean; error?: string }>;
  onDeleteFile: (fileId: string, filePath: string) => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  searchQuery?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({
  folders,
  files,
  onCreateFolder,
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getFileIcon = (fileType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const type = fileType.toLowerCase();

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
    return fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
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

  // Handle Multi-file Upload
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgressText(`Uploading ${i + 1} of ${fileList.length}: ${file.name}`);
      const res = await onUploadFile(currentFolderId, file);
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    setIsUploading(false);
    setUploadProgressText('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (failedCount === 0) {
      onShowToast(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`, 'success');
    } else {
      onShowToast(`Uploaded ${successCount} files (${failedCount} failed)`, failedCount > 0 ? 'error' : 'success');
    }
  };

  // Drag and Drop handlers
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
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300">
            <HardDrive className="h-4 w-4 text-indigo-500" />
            <span>{formatBytes(totalBytes)}</span>
            <span className="text-slate-400">•</span>
            <span>{files.length} files</span>
            <span className="text-slate-400">•</span>
            <span>{folders.length} folders</span>
          </div>

          <button
            id="btn-create-new-folder"
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            <FolderPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            id="btn-trigger-upload-files"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            <span>Upload Files</span>
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFilesSelected(e.target.files)}
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
              className="mr-1 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750"
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
              type="text"
              placeholder="Search in drive..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01] dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-slate-300/80 bg-white hover:border-indigo-400 hover:bg-slate-50/60 dark:border-slate-750 dark:bg-slate-900/60 dark:hover:border-indigo-500 dark:hover:bg-slate-850/60'
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
          {isUploading ? uploadProgressText : 'Drag and drop files here, or click to browse'}
        </h3>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Upload images, documents, PDFs, spreadsheets, or code files into{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {currentFolder ? currentFolder.name : 'Root Drive'}
          </span>
        </p>
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

              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:scale-105 transition dark:bg-amber-950/40 dark:text-amber-400">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                        {folder.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {childFilesCount} file{childFilesCount !== 1 ? 's' : ''}
                        {childFoldersCount > 0 ? ` • ${childFoldersCount} subfolder${childFoldersCount !== 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    title="Delete folder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First File</span>
            </button>
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
                      {isImage && file.storageUrl ? (
                        <>
                          <img
                            src={file.storageUrl}
                            alt={file.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <button
                            onClick={() => setPreviewImage({ url: file.storageUrl, name: file.name })}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white"
                            title="Preview image"
                          >
                            <Eye className="h-6 w-6" />
                          </button>
                        </>
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
                      onClick={() => {
                        if (window.confirm(`Delete file "${file.name}"?`)) {
                          onDeleteFile(file.id, file.filePath);
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
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
                              onClick={() => {
                                if (window.confirm(`Delete file "${file.name}"?`)) {
                                  onDeleteFile(file.id, file.filePath);
                                }
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
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
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Design Assets, Invoices, Project Docs"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
              <button
                onClick={() => setPreviewImage(null)}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold hover:bg-slate-700 text-white"
              >
                Close (ESC)
              </button>
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
    </div>
  );
};
