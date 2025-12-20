'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/app/components/ui/button';

// =====================================================
// Types
// =====================================================

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface FileUploaderProps {
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onUpload: (file: File) => Promise<void> | void;
  onRemove?: (fileId: string) => void;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

// =====================================================
// Helper Functions
// =====================================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type.includes('word') || type.includes('document')) {
    return (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

// =====================================================
// File Item Component
// =====================================================

function FileItem({
  uploadedFile,
  onRemove,
}: {
  uploadedFile: UploadedFile;
  onRemove?: (fileId: string) => void;
}) {
  const { file, id, progress, status, errorMessage } = uploadedFile;

  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded-lg ${
        status === 'error'
          ? 'border-red-200 bg-red-50'
          : status === 'success'
          ? 'border-green-200 bg-green-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* File Icon */}
      <div className="flex-shrink-0">{getFileIcon(file.type)}</div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && errorMessage && (
          <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
        )}
      </div>

      {/* Status/Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {status === 'uploading' && (
          <span className="text-xs text-slate-500">{progress}%</span>
        )}
        {status === 'success' && (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Main FileUploader Component
// =====================================================

export default function FileUploader({
  accept = '.pdf,.doc,.docx',
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 5,
  onUpload,
  onRemove,
  multiple = false,
  className = '',
  disabled = false,
  label = 'Upload File',
  helperText,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }

    // Check file type
    if (accept) {
      const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type.toLowerCase();

      const isAccepted = acceptedTypes.some(
        (type) =>
          type === fileExtension ||
          type === fileType ||
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/')))
      );

      if (!isAccepted) {
        return `File type not accepted. Allowed: ${accept}`;
      }
    }

    return null;
  };

  // Process and upload file
  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      const fileId = generateId();

      const uploadedFile: UploadedFile = {
        file,
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: validationError ? 'error' : 'pending',
        errorMessage: validationError || undefined,
      };

      setFiles((prev) => [...prev, uploadedFile]);

      if (validationError) {
        return;
      }

      // Simulate upload progress
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'uploading' as const } : f
        )
      );

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 100);

      try {
        await onUpload(file);

        clearInterval(progressInterval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, progress: 100, status: 'success' as const }
              : f
          )
        );
      } catch (error) {
        clearInterval(progressInterval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error' as const,
                  errorMessage:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    },
    [maxSize, accept, onUpload]
  );

  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    const remainingSlots = maxFiles - files.length;
    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots);

    filesToProcess.forEach(processFile);
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  // Handle file removal
  const handleRemove = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    onRemove?.(fileId);
  };

  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = files.length < maxFiles;

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
            : 'border-slate-300 hover:border-blue-400 cursor-pointer'
        }`}
        onClick={!disabled ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple && canAddMore}
          onChange={handleInputChange}
          disabled={disabled || !canAddMore}
          className="hidden"
        />

        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isDragging ? 'bg-blue-100' : 'bg-slate-100'
            }`}
          >
            <svg
              className={`w-7 h-7 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">
            {accept.split(',').join(', ')} up to {formatFileSize(maxSize)}
          </p>
        </div>

        {/* Helper Text */}
        {helperText && (
          <p className="mt-2 text-xs text-slate-500">{helperText}</p>
        )}
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((uploadedFile) => (
            <FileItem
              key={uploadedFile.id}
              uploadedFile={uploadedFile}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Max Files Warning */}
      {!canAddMore && (
        <p className="mt-2 text-xs text-amber-600">
          Maximum of {maxFiles} file{maxFiles !== 1 ? 's' : ''} reached
        </p>
      )}
    </div>
  );
}
