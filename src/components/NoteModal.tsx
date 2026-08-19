import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Pin, Bell, Sparkles, AlertCircle, Loader2, Calendar, Paperclip, ImageIcon, Download,
  Bold, Italic, Underline, Strikethrough, Type, AlignLeft, List, ListOrdered, Link2, Quote, Code, Plus, Check
} from 'lucide-react';
import { Note } from '../types';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => Promise<{ success: boolean; error?: string }> | void;
  initialNote?: Note | null;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState('Engineering');
  const [colorScheme, setColorScheme] = useState<Note['colorScheme']>('default');
  const [isPinned, setIsPinned] = useState(false);
  const [notifyAt, setNotifyAt] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; size?: number }[]>([]);
  const [showImageInput, setShowImageInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [categoriesList, setCategoriesList] = useState<string[]>(['Engineering', 'Design', 'Personal', 'Ideas', 'General']);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [availableTagsList, setAvailableTagsList] = useState<string[]>(['Urgent', 'Idea', 'To-Do', 'Meeting']);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedCat = localStorage.getItem('ws_note_categories');
    if (savedCat) {
      try {
        setCategoriesList(JSON.parse(savedCat));
      } catch (e) {
        console.warn('Failed to parse saved categories');
      }
    }
    const savedTags = localStorage.getItem('ws_note_tags');
    if (savedTags) {
      try {
        setAvailableTagsList(JSON.parse(savedTags));
      } catch (e) {
        console.warn('Failed to parse saved tags');
      }
    }
  }, []);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title);
      setContent(initialNote.content);
      setSelectedTags(initialNote.tags || []);
      setCategory(initialNote.category || 'Engineering');
      setColorScheme(initialNote.colorScheme || 'default');
      setIsPinned(initialNote.isPinned || false);
      setImageUrl(initialNote.imageUrl || '');
      setAttachments(initialNote.attachments || []);
      setErrorMessage(null);
      if (initialNote.notifyAt) {
        const dateObj = new Date(initialNote.notifyAt);
        const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setNotifyAt(localIso);
        setHasReminder(true);
      } else {
        setNotifyAt('');
        setHasReminder(false);
      }
    } else {
      setTitle('');
      setContent('');
      setSelectedTags([]);
      setCategory('Engineering');
      setColorScheme('default');
      setIsPinned(false);
      setImageUrl('');
      setAttachments([]);
      setShowImageInput(false);
      setNotifyAt('');
      setHasReminder(false);
      setErrorMessage(null);
    }
  }, [initialNote, isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  if (!isOpen) return null;

  const handleApplyPreset = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNotifyAt(localIso);
    setHasReminder(true);
  };

  const handleApplyTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNotifyAt(localIso);
    setHasReminder(true);
  };

  const handleClose = () => {
    const isEditing = !!initialNote;
    const hasUnsavedChanges = isEditing
      ? title !== initialNote.title ||
        content !== initialNote.content ||
        imageUrl !== (initialNote.imageUrl || '') ||
        JSON.stringify(selectedTags) !== JSON.stringify(initialNote.tags || [])
      : title.trim() !== '' || content.trim() !== '' || imageUrl.trim() !== '' || selectedTags.length > 0;

    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    onClose();
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categoriesList.includes(newCategoryName.trim())) {
      const newList = [...categoriesList, newCategoryName.trim()];
      setCategoriesList(newList);
      localStorage.setItem('ws_note_categories', JSON.stringify(newList));
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowCategoryDropdown(false);
    }
  };

  const handleRemoveCategory = (e: React.MouseEvent, catToRemove: string) => {
    e.stopPropagation(); // prevent dropdown from closing or selecting
    const newList = categoriesList.filter((c) => c !== catToRemove);
    setCategoriesList(newList);
    localStorage.setItem('ws_note_categories', JSON.stringify(newList));
    if (category === catToRemove) {
      setCategory(newList[0] || 'General');
    }
  };

  const handleAddAvailableTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagName.trim().replace(/^#/, '');
    if (cleanTag && !availableTagsList.includes(cleanTag)) {
      const newList = [...availableTagsList, cleanTag];
      setAvailableTagsList(newList);
      localStorage.setItem('ws_note_tags', JSON.stringify(newList));
      setSelectedTags((prev) => [...prev, cleanTag]);
      setNewTagName('');
    }
  };

  const handleRemoveAvailableTag = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    const newList = availableTagsList.filter((t) => t !== tagToRemove);
    setAvailableTagsList(newList);
    localStorage.setItem('ws_note_tags', JSON.stringify(newList));
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const toggleTagSelection = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Cover image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (coverImageInputRef.current) coverImageInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [...attachments];
    let hasError = false;

    Array.from(files).forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        hasError = true;
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: event.target?.result as string,
          size: file.size
        });
        setAttachments([...newAttachments]);
      };
      reader.readAsDataURL(file);
    });

    if (hasError) {
      setErrorMessage('Some files were skipped. Attachments must be less than 5MB each.');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleViewAttachment = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error('Error opening attachment', err);
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownloadAttachment = (e: React.MouseEvent, att: {name: string, url: string}) => {
    e.preventDefault();
    const a = document.createElement('a');
    a.href = att.url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim()) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const notePayload = {
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      tags: selectedTags,
      category: category.trim() || 'General',
      colorScheme,
      isPinned,
      imageUrl: imageUrl.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      notifyAt: hasReminder && notifyAt ? new Date(notifyAt).toISOString() : undefined,
      notified: false,
    };

    try {
      const result = await onSave(notePayload, initialNote ? initialNote.id : undefined);
      if (result && typeof result === 'object' && result.success === false) {
        setErrorMessage(result.error || 'Failed to save note.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.');
      setIsSubmitting(false);
    }
  };

  const colorOptions: { id: Note['colorScheme']; label: string; bg: string }[] = [
    { id: 'default', label: 'Default', bg: 'bg-slate-200 dark:bg-slate-700' },
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-400' },
    { id: 'amber', label: 'Amber', bg: 'bg-amber-400' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-400' },
    { id: 'sky', label: 'Sky', bg: 'bg-sky-400' },
    { id: 'rose', label: 'Rose', bg: 'bg-rose-400' },
  ];

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end, text.length);
    
    setContent(before + prefix + selected + suffix + after);
    
    // Set focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
      {/* Modal Card */}
      <div className="relative flex flex-col w-full h-full sm:h-[90vh] sm:max-w-5xl sm:rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Header (Top Nav) */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              <span>Save Note</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            
            {/* Attach File Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              multiple 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Attach File</span>
            </button>

            {/* Cover Image Input Dropdown / Popover */}
            {!imageUrl && (
              <div className="relative">
                <input 
                  type="file" 
                  ref={coverImageInputRef} 
                  onChange={handleCoverUpload} 
                  accept="image/*"
                  className="hidden" 
                />
                <button
                  onClick={() => coverImageInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Cover</span>
                </button>
              </div>
            )}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-16 lg:px-32 pb-32">
          
          {errorMessage && (
            <div className="mb-8 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cover Image Preview */}
          {imageUrl && (
            <div className="group relative w-full h-48 sm:h-64 mb-8 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img 
                src={imageUrl} 
                alt="Cover" 
                className="object-cover w-full h-full" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/1200x400/1e293b/475569?text=Invalid+Image+URL'; }} 
              />
              <button 
                onClick={() => setImageUrl('')}
                className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Title Input */}
          <div className="mt-8">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full bg-transparent text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 placeholder-slate-200/80 outline-none dark:text-white dark:placeholder-slate-700/80"
            />
          </div>

          {/* Minimal Rich Text Toolbar */}
          <div className="mt-8 flex flex-wrap items-center gap-1 sm:gap-2 border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <span className="mr-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Normal</span>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            <div className="flex items-center gap-1">
              <button onClick={() => insertMarkdown('**', '**')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Bold className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('*', '*')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Italic className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('__', '__')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Underline className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('~~', '~~')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Strikethrough className="h-4 w-4" /></button>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            <div className="flex items-center gap-1">
              <button onClick={() => insertMarkdown('- ')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><List className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('1. ')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><ListOrdered className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Link2 className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('> ')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Quote className="h-4 w-4" /></button>
              <button onClick={() => insertMarkdown('`', '`')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition dark:hover:text-slate-200 dark:hover:bg-slate-800"><Code className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Editor Textarea */}
          <div className="mt-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Press '/' for commands..."
              className="w-full resize-none overflow-hidden bg-transparent text-lg leading-relaxed text-slate-700 placeholder-slate-300 outline-none dark:text-slate-300 dark:placeholder-slate-600 min-h-[400px]"
            />
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Paperclip className="h-4 w-4" />
                <span>Attachments ({attachments.length})</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group flex items-center rounded-2xl border border-indigo-100 bg-indigo-50/50 p-1 pr-16 dark:border-indigo-900/30 dark:bg-indigo-900/10 max-w-full">
                    <a
                      href={att.url}
                      onClick={(e) => handleViewAttachment(e, att.url)}
                      className="flex items-center gap-4 flex-1 p-2 cursor-pointer w-full overflow-hidden"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800 overflow-hidden">
                        {(att.url.match(/\.(jpeg|jpg|gif|png)$/i) || att.url.startsWith('data:image')) ? (
                          <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors" title={att.name}>{att.name}</p>
                        <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 group-hover:underline">Click to view</p>
                      </div>
                    </a>
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDownloadAttachment(e, att)}
                        className="text-slate-400 hover:text-indigo-500 bg-indigo-50 dark:bg-slate-800 p-1.5 rounded-full transition-colors"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setAttachments(attachments.filter(a => a.id !== att.id));
                        }}
                        className="text-slate-400 hover:text-rose-500 bg-indigo-50 dark:bg-slate-800 p-1.5 rounded-full transition-colors"
                        title="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="mt-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
            Your note will be saved securely.
          </p>

        </div>

        {/* Bottom Metadata Bar */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-4 px-6 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category */}
            <div className="relative flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folder</span>
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex w-32 items-center justify-between bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-300"
              >
                <span className="truncate">{category || 'General'}</span>
              </button>
              
              {showCategoryDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                  <div className="max-h-48 overflow-y-auto p-1">
                    {categoriesList.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          category === cat
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {categoriesList.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveCategory(e, cat)}
                            className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                            title="Remove folder"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                    <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New folder..."
                        className="w-full rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!newCategoryName.trim()}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Tags */}
            <div className="relative flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags</span>
              <button
                type="button"
                onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                className="flex w-40 items-center justify-between bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-300"
              >
                <span className="truncate">
                  {selectedTags.length > 0 ? selectedTags.map(t=>`#${t}`).join(', ') : <span className="text-slate-400 font-normal">Select tags...</span>}
                </span>
              </button>
              
              {showTagsDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                  <div className="max-h-48 overflow-y-auto p-1">
                    {availableTagsList.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <div
                          key={tag}
                          onClick={() => toggleTagSelection(tag)}
                          className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">#{tag}</span>
                          <div className="flex items-center gap-2">
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveAvailableTag(e, tag)}
                              className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                              title="Remove tag globally"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {availableTagsList.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 text-center">No tags available</div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                    <form onSubmit={handleAddAvailableTag} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="New tag..."
                        className="w-full rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!newTagName.trim()}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Color */}
            <div className="flex items-center gap-1.5">
              {colorOptions.map((co) => (
                <button
                  key={co.id}
                  type="button"
                  onClick={() => setColorScheme(co.id)}
                  className={`h-4 w-4 rounded-full ${co.bg} transition-all ${
                    colorScheme === co.id ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={co.label}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                  : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              <Pin className={`h-3 w-3 ${isPinned ? 'fill-current' : ''}`} />
              <span>{isPinned ? 'Pinned' : 'Pin'}</span>
            </button>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="sm:hidden w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
