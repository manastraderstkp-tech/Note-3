import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Save,
  RefreshCw,
  Maximize2,
  Sliders,
  Sun,
  Contrast,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { UserFile } from '../types';
import { triggerBlobDownload } from '../lib/fileStorage';

interface ImagePreviewModalProps {
  imageSrc: string;
  fileName: string;
  file?: UserFile | null;
  onClose: () => void;
  onDownloadFile: (fileOrData: { name: string; storageUrl?: string; id?: string; fileType?: string }) => Promise<void>;
  onSaveModifiedImage?: (file: UserFile, newBlob: Blob, newFile: File) => Promise<boolean>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageSrc,
  fileName,
  file,
  onClose,
  onDownloadFile,
  onSaveModifiedImage,
  onShowToast,
}) => {
  // Transformation States
  const [currentSrc, setCurrentSrc] = useState<string>(imageSrc);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Filter Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [invert, setInvert] = useState<boolean>(false);

  // UI States
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Pan / Drag State for zoomed-in view
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Track if any geometric or color changes exist
  const hasChanges =
    rotation % 360 !== 0 ||
    flipH ||
    flipV ||
    brightness !== 100 ||
    contrast !== 100 ||
    grayscale !== 0 ||
    sepia !== 0 ||
    invert;

  // Sync internal src if prop changes
  useEffect(() => {
    setCurrentSrc(imageSrc);
  }, [imageSrc]);

  // Handle ESC and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        handleRotateRight();
      } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, hasChanges, rotation, flipH, flipV, brightness, contrast, grayscale, sepia, invert]);

  // Zoom Handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Math.round((prev + 0.25) * 100) / 100, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Rotation & Flip Handlers
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleFlipH = () => {
    setFlipH((prev) => !prev);
  };

  const handleFlipV = () => {
    setFlipV((prev) => !prev);
  };

  // Reset all transformations & filters
  const handleResetAll = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setGrayscale(0);
    setSepia(0);
    setInvert(false);
    setPan({ x: 0, y: 0 });
    onShowToast('Reset all adjustments to default', 'info');
  };

  // Drag Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Helper to generate a transformed Canvas and Blob
  const exportTransformedBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const isRotated90or270 = Math.abs(rotation % 180) === 90;
        const targetWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
        const targetHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        // Apply filters to context
        const filterString = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%) ${
          invert ? 'invert(100%)' : ''
        }`.trim();
        ctx.filter = filterString;

        // Move to center of canvas
        ctx.translate(targetWidth / 2, targetHeight / 2);

        // Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);

        // Apply flips
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

        // Draw image centered
        ctx.drawImage(
          img,
          -img.naturalWidth / 2,
          -img.naturalHeight / 2,
          img.naturalWidth,
          img.naturalHeight
        );

        const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          mimeType,
          0.95
        );
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = currentSrc;
    });
  };

  // Save changes to storage & file record
  const handleSave = async () => {
    if (!hasChanges) {
      onShowToast('No changes detected to save.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const transformedBlob = await exportTransformedBlob();
      if (!transformedBlob) {
        throw new Error('Failed to generate modified image canvas.');
      }

      const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const modifiedFile = new File([transformedBlob], fileName, { type: mimeType });

      if (file && onSaveModifiedImage) {
        const success = await onSaveModifiedImage(file, transformedBlob, modifiedFile);
        if (success) {
          // Update internal preview with fresh object URL
          const newUrl = URL.createObjectURL(transformedBlob);
          setCurrentSrc(newUrl);
          // Reset transformation modifiers since they are now baked into the file
          setRotation(0);
          setFlipH(false);
          setFlipV(false);
          setBrightness(100);
          setContrast(100);
          setGrayscale(0);
          setSepia(0);
          setInvert(false);
          onShowToast('Image changes saved successfully!', 'success');
        }
      } else {
        // Standalone download fallback if file record is not bound
        triggerBlobDownload(transformedBlob, fileName);
        onShowToast('Modified image downloaded to device.', 'success');
      }
    } catch (err: any) {
      console.error('Error saving modified image:', err);
      onShowToast(err?.message || 'Failed to save modified image.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Download handling
  const handleDownload = async () => {
    if (hasChanges) {
      const transformedBlob = await exportTransformedBlob();
      if (transformedBlob) {
        triggerBlobDownload(transformedBlob, fileName);
        onShowToast('Transformed image downloaded successfully.', 'success');
        return;
      }
    }

    // Default download if unchanged
    await onDownloadFile(
      file || {
        name: fileName,
        storageUrl: currentSrc,
      }
    );
  };

  // CSS transform string for active image
  const transformStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
      flipH ? -1 : 1
    }) scaleY(${flipV ? -1 : 1})`,
    filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%) ${
      invert ? 'invert(100%)' : ''
    }`.trim(),
    transition: isDragging ? 'none' : 'transform 0.2s ease-out, filter 0.2s ease-out',
    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
  };

  return (
    <div
      id="modal-image-preview-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <div
        id="modal-image-preview-container"
        className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="truncate text-sm font-bold text-slate-100 max-w-xs sm:max-w-md">
              {fileName}
            </span>
            {imageDimensions && (
              <span className="hidden sm:inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                {imageDimensions.width} × {imageDimensions.height} px
              </span>
            )}
            {hasChanges && (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30 animate-pulse">
                <Sparkles className="h-3 w-3" />
                <span>Modified</span>
              </span>
            )}
          </div>

          {/* Action Buttons Top Right */}
          <div className="flex items-center gap-2">
            {/* Save Button */}
            <button
              id="btn-image-save-changes"
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                hasChanges
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-emerald-600/25 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
              }`}
              title={hasChanges ? 'Save changes to file' : 'No changes to save'}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save Changes</span>
            </button>

            {/* Download Button */}
            <button
              id="btn-image-download"
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition shadow-xs shadow-indigo-600/25"
              title="Download image"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-image-close-preview"
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition active:scale-95"
              title="Close viewer (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image Display & Canvas Stage */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950/90 p-4"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={currentSrc}
            alt={fileName}
            style={transformStyle}
            className="max-h-full max-w-full rounded-lg object-contain pointer-events-none select-none shadow-2xl"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              const target = e.currentTarget;
              setImageDimensions({ width: target.naturalWidth, height: target.naturalHeight });
            }}
          />

          {/* Quick Zoom Indicator Floating badge */}
          {zoom !== 1 && (
            <div className="absolute top-4 left-4 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-mono font-bold text-slate-300 backdrop-blur-md border border-slate-700">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Adjustments Filter Drawer (Toggleable) */}
        {showAdjustments && (
          <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-6 py-3 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300">
              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-amber-400" /> Brightness
                  </span>
                  <span className="font-mono text-slate-400">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="flex items-center gap-1">
                    <Contrast className="h-3.5 w-3.5 text-sky-400" /> Contrast
                  </span>
                  <span className="font-mono text-slate-400">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Grayscale */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Grayscale</span>
                  <span className="font-mono text-slate-400">{grayscale}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={grayscale}
                  onChange={(e) => setGrayscale(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Sepia & Invert Quick Presets */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSepia((prev) => (prev > 0 ? 0 : 80))}
                  className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition ${
                    sepia > 0
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Sepia
                </button>
                <button
                  type="button"
                  onClick={() => setInvert((prev) => !prev)}
                  className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition ${
                    invert
                      ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setGrayscale(0);
                    setSepia(0);
                    setInvert(false);
                  }}
                  className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  title="Reset filters"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Control Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 border-t border-slate-800 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
          {/* Zoom Group */}
          <div className="flex items-center rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
            <button
              id="btn-image-zoom-out"
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              id="btn-image-zoom-level"
              type="button"
              onClick={handleResetZoom}
              className="px-2 text-[11px] font-mono font-bold text-slate-300 hover:text-indigo-400 transition"
              title="Click to reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              id="btn-image-zoom-in"
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              id="btn-image-zoom-fit"
              type="button"
              onClick={handleResetZoom}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition border-l border-slate-700"
              title="Fit to view (0)"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-700/60 hidden sm:block" />

          {/* Rotate Group */}
          <div className="flex items-center rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
            <button
              id="btn-image-rotate-left"
              type="button"
              onClick={handleRotateLeft}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Rotate Left 90°"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">-90°</span>
            </button>
            <button
              id="btn-image-rotate-right"
              type="button"
              onClick={handleRotateRight}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Rotate Right 90° (R)"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">+90°</span>
            </button>
          </div>

          {/* Flip Group */}
          <div className="flex items-center rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
            <button
              id="btn-image-flip-h"
              type="button"
              onClick={handleFlipH}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                flipH
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Flip Horizontally (H)"
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">Flip H</span>
            </button>
            <button
              id="btn-image-flip-v"
              type="button"
              onClick={handleFlipV}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                flipV
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Flip Vertically (V)"
            >
              <FlipVertical className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">Flip V</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-700/60 hidden sm:block" />

          {/* Adjustments Filter Toggle Button */}
          <button
            id="btn-image-toggle-adjustments"
            type="button"
            onClick={() => setShowAdjustments((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
              showAdjustments
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Adjust colors & tone"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Adjust</span>
          </button>

          {/* Reset All Modifications */}
          <button
            id="btn-image-reset-all"
            type="button"
            onClick={handleResetAll}
            disabled={!hasChanges && zoom === 1}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
            title="Reset all adjustments"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
