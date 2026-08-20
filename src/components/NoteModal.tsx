import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Pin, Bell, Sparkles, AlertCircle, Loader2, Calendar, Paperclip, ImageIcon, Download,
  Bold, Italic, Underline, Strikethrough, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Quote, Code, Plus, Check, Palette, Highlighter, ChevronDown,
  RotateCcw, RotateCw, RemoveFormatting, Minus, Heading1, Heading2, Heading3, Text, Undo, Redo,
  CheckSquare, Divide, Subscript, Superscript
} from 'lucide-react';
import { Note } from '../types';
import { convertPlainTextToHtml } from '../lib/textUtils';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => Promise<{ success: boolean; error?: string }> | void;
  initialNote?: Note | null;
}

const FONT_FAMILIES = [
  { id: 'sans', label: 'Modern Sans (Inter)', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Editorial Serif (Georgia)', value: 'Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'mono', label: 'Monospace (Code)', value: '"Fira Code", Menlo, Monaco, Consolas, "Liberation Mono", monospace' },
  { id: 'poppins', label: 'Poppins (Geometric)', value: '"Poppins", system-ui, sans-serif' },
  { id: 'handwriting', label: 'Handwriting (Script)', value: '"Caveat", "Brush Script MT", cursive' },
  { id: 'casual', label: 'Comic / Casual', value: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
  { id: 'playfair', label: 'Playfair (Luxury Serif)', value: '"Playfair Display", Georgia, serif' },
];

const FONT_SIZES = [
  { label: '12px (Small)', value: '12px' },
  { label: '14px (Normal)', value: '14px' },
  { label: '16px (Medium)', value: '16px' },
  { label: '18px (Large)', value: '18px' },
  { label: '22px (Extra Large)', value: '22px' },
  { label: '28px (Heading 2)', value: '28px' },
  { label: '36px (Heading 1)', value: '36px' },
];

const TEXT_COLORS = [
  { label: 'Default Auto', value: 'inherit', bg: 'bg-slate-800 dark:bg-slate-200' },
  { label: 'Pure Black', value: '#000000', bg: 'bg-black' },
  { label: 'Slate Gray', value: '#64748b', bg: 'bg-slate-500' },
  { label: 'Crimson Red', value: '#dc2626', bg: 'bg-red-600' },
  { label: 'Rose Pink', value: '#e11d48', bg: 'bg-rose-600' },
  { label: 'Amber Orange', value: '#d97706', bg: 'bg-amber-600' },
  { label: 'Sunny Yellow', value: '#ca8a04', bg: 'bg-yellow-600' },
  { label: 'Forest Green', value: '#16a34a', bg: 'bg-green-600' },
  { label: 'Emerald', value: '#059669', bg: 'bg-emerald-600' },
  { label: 'Teal Cyan', value: '#0d9488', bg: 'bg-teal-600' },
  { label: 'Sky Blue', value: '#0284c7', bg: 'bg-sky-600' },
  { label: 'Royal Indigo', value: '#4f46e5', bg: 'bg-indigo-600' },
  { label: 'Purple Violet', value: '#7c3aed', bg: 'bg-purple-600' },
  { label: 'Fuchsia Pink', value: '#c026d3', bg: 'bg-fuchsia-600' },
];

const HIGHLIGHT_COLORS = [
  { label: 'No Highlight', value: 'transparent', bg: 'border border-slate-300 bg-transparent' },
  { label: 'Neon Yellow', value: '#fef08a', bg: 'bg-yellow-200' },
  { label: 'Soft Green', value: '#bbf7d0', bg: 'bg-green-200' },
  { label: 'Sky Blue', value: '#bae6fd', bg: 'bg-sky-200' },
  { label: 'Rose Pink', value: '#fbcfe8', bg: 'bg-pink-200' },
  { label: 'Peach Orange', value: '#fed7aa', bg: 'bg-orange-200' },
  { label: 'Lilac Purple', value: '#e9d5ff', bg: 'bg-purple-200' },
  { label: 'Light Gray', value: '#e2e8f0', bg: 'bg-slate-200' },
];

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
}) => {
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState('Engineering');
  const [colorScheme, setColorScheme] = useState<Note['colorScheme']>('default');
  const [isPinned, setIsPinned] = useState(false);
  const [notifyAt, setNotifyAt] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; size?: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formatting state
  const [currentFontSize, setCurrentFontSize] = useState('16px');
  const [currentFontFamily, setCurrentFontFamily] = useState(FONT_FAMILIES[0].value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Category & Tag manager state
  const [categoriesList, setCategoriesList] = useState<string[]>(['Engineering', 'Design', 'Personal', 'Ideas', 'General']);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [availableTagsList, setAvailableTagsList] = useState<string[]>(['Urgent', 'Idea', 'To-Do', 'Meeting']);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

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

  // Initialize form when modal opens or note changes
  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title || '');
        const formattedHtml = convertPlainTextToHtml(initialNote.content || '');
        setContentHtml(formattedHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = formattedHtml;
        }
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
        const initialHtml = '<p><br></p>';
        setContentHtml(initialHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = initialHtml;
        }
        setSelectedTags([]);
        setCategory('Engineering');
        setColorScheme('default');
        setIsPinned(false);
        setImageUrl('');
        setAttachments([]);
        setNotifyAt('');
        setHasReminder(false);
        setErrorMessage(null);
      }
    }
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const applyFontSize = (sizeStr: string) => {
    restoreSelection();
    setCurrentFontSize(sizeStr);
    setShowFontSizeDropdown(false);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Apply style to block or container
      document.execCommand('fontSize', false, '7');
      const fonts = editorRef.current?.querySelectorAll('font[size="7"]');
      fonts?.forEach((f) => {
        const span = document.createElement('span');
        span.style.fontSize = sizeStr;
        span.innerHTML = f.innerHTML;
        f.parentNode?.replaceChild(span, f);
      });
      handleEditorInput();
      return;
    }

    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = sizeStr;
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch {
      document.execCommand('fontSize', false, '4');
    }
    handleEditorInput();
  };

  const stepFontSize = (delta: number) => {
    const currentNum = parseInt(currentFontSize, 10) || 16;
    const newNum = Math.max(10, Math.min(64, currentNum + delta));
    applyFontSize(`${newNum}px`);
  };

  const applyFontFamily = (fontFamilyVal: string) => {
    restoreSelection();
    setCurrentFontFamily(fontFamilyVal);
    setShowFontFamilyDropdown(false);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontName', false, fontFamilyVal);
    handleEditorInput();
  };

  const applyTextColor = (color: string) => {
    restoreSelection();
    setShowColorPicker(false);
    document.execCommand('styleWithCSS', false, 'true');
    if (color === 'inherit') {
      document.execCommand('removeFormat', false);
    } else {
      document.execCommand('foreColor', false, color);
    }
    handleEditorInput();
  };

  const applyHighlightColor = (color: string) => {
    restoreSelection();
    setShowHighlightPicker(false);
    document.execCommand('styleWithCSS', false, 'true');
    if (color === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    handleEditorInput();
  };

  const handleOpenLinkModal = () => {
    saveSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      setLinkText(sel.toString());
    } else {
      setLinkText('');
    }
    setLinkUrl('');
    setShowLinkPrompt(true);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    restoreSelection();
    const url = linkUrl.trim().startsWith('http://') || linkUrl.trim().startsWith('https://')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;

    if (linkText.trim()) {
      document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400 font-medium">${linkText.trim()}</a>`);
    } else {
      document.execCommand('createLink', false, url);
    }
    setShowLinkPrompt(false);
    handleEditorInput();
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

  const handleClose = () => {
    const isEditing = !!initialNote;
    const currentText = editorRef.current?.innerText?.trim() || '';
    const initialText = initialNote ? (initialNote.content || '').replace(/<[^>]+>/g, '').trim() : '';

    const hasUnsavedChanges = isEditing
      ? title !== initialNote.title ||
        currentText !== initialText ||
        imageUrl !== (initialNote.imageUrl || '') ||
        JSON.stringify(selectedTags) !== JSON.stringify(initialNote.tags || [])
      : title.trim() !== '' || currentText !== '' || imageUrl.trim() !== '' || selectedTags.length > 0;

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
    e.stopPropagation();
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

  const handleSubmit = async () => {
    const rawHtml = editorRef.current?.innerHTML || '';
    const plainText = editorRef.current?.innerText?.trim() || '';

    if (!title.trim() && !plainText) {
      setErrorMessage('Please enter a note title or content.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const notePayload = {
      title: title.trim() || 'Untitled Note',
      content: rawHtml.trim() || `<p>${plainText}</p>`,
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

  const wordCount = (editorRef.current?.innerText || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (editorRef.current?.innerText || '').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
      {/* Modal Card */}
      <div className="relative flex flex-col w-full h-full sm:h-[92vh] sm:max-w-5xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Header (Top Nav) */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="hidden sm:inline text-[11px] font-medium text-slate-400">
              {wordCount} words • {charCount} chars
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-amber-500/20 transition disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
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
              title="Attach files or documents"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            {/* Cover Image Input */}
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
                  title="Add banner cover image"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cover</span>
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Close editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content & Visual Editor Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-12 lg:px-20 py-6">
          
          {errorMessage && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cover Image Preview */}
          {imageUrl && (
            <div className="group relative w-full h-44 sm:h-56 mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-xs">
              <img 
                src={imageUrl} 
                alt="Cover" 
                className="object-cover w-full h-full" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/1200x400/1e293b/475569?text=Invalid+Image+URL'; }} 
              />
              <button 
                onClick={() => setImageUrl('')}
                className="absolute top-3 right-3 bg-slate-900/70 hover:bg-rose-600 text-white p-2 rounded-full backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                title="Remove cover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 placeholder-slate-300 outline-none dark:text-white dark:placeholder-slate-700"
            />
          </div>

          {/* Comprehensive Rich Text & Font Formatting Toolbar */}
          <div className="sticky top-0 z-20 mt-5 mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/95">
            
            {/* Font Family Dropdown */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  setShowFontFamilyDropdown(!showFontFamilyDropdown);
                  setShowFontSizeDropdown(false);
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                title="Change Font Family"
              >
                <Type className="h-3.5 w-3.5 text-slate-500" />
                <span className="max-w-[80px] sm:max-w-[110px] truncate">
                  {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label.split(' ')[0] || 'Font'}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showFontFamilyDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Font Family
                  </div>
                  {FONT_FAMILIES.map((ff) => (
                    <button
                      key={ff.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFontFamily(ff.value);
                      }}
                      style={{ fontFamily: ff.value }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                        currentFontFamily === ff.value
                          ? 'bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{ff.label}</span>
                      {currentFontFamily === ff.value && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown & Quick Scaling (A- / A+) */}
            <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  stepFontSize(-2);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Decrease Font Size (A-)"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                    setShowFontSizeDropdown(!showFontSizeDropdown);
                    setShowFontFamilyDropdown(false);
                    setShowColorPicker(false);
                    setShowHighlightPicker(false);
                  }}
                  className="px-2 py-1 text-xs font-bold text-slate-800 hover:text-amber-600 dark:text-slate-200"
                  title="Select Font Size"
                >
                  {currentFontSize}
                </button>

                {showFontSizeDropdown && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-36 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Font Size
                    </div>
                    {FONT_SIZES.map((fs) => (
                      <button
                        key={fs.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyFontSize(fs.value);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                          currentFontSize === fs.value
                            ? 'bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{fs.label}</span>
                        {currentFontSize === fs.value && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  stepFontSize(2);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Increase Font Size (A+)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Text Color Picker */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                  setShowFontFamilyDropdown(false);
                  setShowFontSizeDropdown(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Text / Font Color"
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black leading-none">A</span>
                  <div className="h-1 w-3.5 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500 mt-0.5" />
                </div>
              </button>

              {showColorPicker && (
                <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Text Color Palette
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {TEXT_COLORS.map((tc) => (
                      <button
                        key={tc.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyTextColor(tc.value);
                        }}
                        className={`h-7 w-7 rounded-xl ${tc.bg} flex items-center justify-center border border-slate-200/50 shadow-2xs transition hover:scale-110`}
                        title={tc.label}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500">Custom:</span>
                    <input
                      type="color"
                      onChange={(e) => applyTextColor(e.target.value)}
                      className="h-6 w-full cursor-pointer rounded-md border-0 bg-transparent"
                      title="Choose custom color"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Background / Highlight Color Picker */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                  setShowFontFamilyDropdown(false);
                  setShowFontSizeDropdown(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Highlight Background Color"
              >
                <Highlighter className="h-4 w-4 text-amber-500" />
              </button>

              {showHighlightPicker && (
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Highlight Color
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {HIGHLIGHT_COLORS.map((hc) => (
                      <button
                        key={hc.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyHighlightColor(hc.value);
                        }}
                        className={`h-7 w-7 rounded-xl ${hc.bg} flex items-center justify-center border border-slate-200/50 shadow-2xs transition hover:scale-110`}
                        title={hc.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Basic Styles: Bold, Italic, Underline, Strikethrough */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('bold');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('italic');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('underline');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('strikeThrough');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Block Headings: H1, H2, H3, Paragraph */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('formatBlock', '<h1>');
                }}
                className="flex h-8 px-2 items-center justify-center rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('formatBlock', '<h2>');
                }}
                className="flex h-8 px-2 items-center justify-center rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('formatBlock', '<p>');
                }}
                className="flex h-8 px-2 items-center justify-center rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Paragraph / Normal Text"
              >
                P
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Alignments: Left, Center, Right, Justify */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyLeft');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyCenter');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyRight');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Lists & Extras: Bullet, Numbered, Quote, Code, Link, Divider */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('insertUnorderedList');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('insertOrderedList');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('formatBlock', '<blockquote>');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Blockquote"
              >
                <Quote className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('formatBlock', '<pre>');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Code Block"
              >
                <Code className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleOpenLinkModal();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Insert Web Link"
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('insertHorizontalRule');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Horizontal Divider"
              >
                <Divide className="h-4 w-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Undo / Redo & Clear Format */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('undo');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('redo');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('removeFormat');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Clear Formatting"
              >
                <RemoveFormatting className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

          {/* Interactive ContentEditable Visual Editor */}
          <div className="relative min-h-[320px] sm:min-h-[420px] rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6 transition-all focus-within:border-amber-400/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/10 dark:border-slate-800/80 dark:bg-slate-900/40 dark:focus-within:border-amber-500/80 dark:focus-within:bg-slate-900">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onBlur={saveSelection}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              style={{ fontFamily: currentFontFamily }}
              className="prose prose-slate dark:prose-invert max-w-none min-h-[300px] outline-none text-slate-800 dark:text-slate-200 leading-relaxed text-base [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-black [&_h1]:mb-3 [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xl"
              data-placeholder="Start typing your note details, thoughts, specs or meeting records..."
            />
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Paperclip className="h-4 w-4 text-indigo-500" />
                <span>Attachments ({attachments.length})</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group flex items-center rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2 pr-12 dark:border-indigo-900/40 dark:bg-indigo-900/20 max-w-full">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 overflow-hidden cursor-pointer"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-slate-800 overflow-hidden">
                        {(att.url.match(/\.(jpeg|jpg|gif|png)$/i) || att.url.startsWith('data:image')) ? (
                          <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                        ) : (
                          <Paperclip className="h-4 w-4 text-indigo-500" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 transition" title={att.name}>{att.name}</p>
                        <p className="text-[10px] text-indigo-500 font-semibold">Click to preview</p>
                      </div>
                    </a>
                    <button
                      onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Link Input Modal */}
        {showLinkPrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Insert Hyperlink</h4>
              <form onSubmit={handleInsertLink} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Link Text (Optional)</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Display text..."
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Web URL</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                    required
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkPrompt(false)}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Insert Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Metadata Bar */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-3.5 px-6 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category */}
            <div className="relative flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folder</span>
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <span className="max-w-[90px] truncate">{category || 'General'}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              
              {showCategoryDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
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
                        className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!newCategoryName.trim()}
                        className="rounded-lg bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
            <div className="relative flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags</span>
              <button
                type="button"
                onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <span className="max-w-[110px] truncate">
                  {selectedTags.length > 0 ? selectedTags.map(t=>`#${t}`).join(', ') : <span className="text-slate-400 font-normal">Add tags...</span>}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
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
                  </div>
                  <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                    <form onSubmit={handleAddAvailableTag} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="New tag..."
                        className="w-full rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!newTagName.trim()}
                        className="rounded-lg bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Note Theme Card Color */}
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

            {/* Pin Toggle */}
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
            className="sm:hidden w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
