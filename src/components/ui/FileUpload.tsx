'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onFilesChange,
  disabled = false,
  className,
  children,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateFiles = (newFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of newFiles) {
      if (file.size > maxSize) {
        errors.push(`${file.name} excede el tamaño máximo de ${formatFileSize(maxSize)}`);
        continue;
      }
      
      if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const fileType = file.type;
        const fileExtension = `.${file.name.split('.').pop()}`;
        
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) return fileExtension.toLowerCase() === type.toLowerCase();
          if (type.endsWith('/*')) return fileType.startsWith(type.replace('/*', '/'));
          return fileType === type;
        });

        if (!isAccepted) {
          errors.push(`${file.name} tiene un formato no permitido`);
          continue;
        }
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const fileArray = Array.from(newFiles);
    const { valid, errors: validationErrors } = validateFiles(fileArray);

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setTimeout(() => setError(null), 5000);
    }

    const updatedFiles = multiple
      ? [...files, ...valid].slice(0, maxFiles)
      : valid.slice(0, 1);

    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-400" />;
    if (file.type.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />;
    return <File className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-all text-center',
          dragActive
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-slate-600 hover:border-slate-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {children || (
          <div className="flex flex-col items-center">
            <div className="p-4 bg-slate-700/50 rounded-full mb-4">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-white font-medium">
              Arrastra archivos aquí o{' '}
              <span className="text-cyan-400">haz clic para seleccionar</span>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {accept && `Formatos: ${accept}`}
              {accept && maxSize && ' • '}
              {maxSize && `Máx: ${formatFileSize(maxSize)}`}
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeFile(index)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Image Preview Upload
export interface ImageUploadProps {
  value?: string;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  aspectRatio?: 'square' | '16/9' | '4/3' | 'auto';
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  aspectRatio = 'square',
  disabled = false,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(value || null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    auto: '',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      alert(`El archivo excede el tamaño máximo permitido`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('relative', aspectClasses[aspectRatio], className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Cambiar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'w-full h-full min-h-[120px] border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors',
            !disabled && 'hover:border-slate-500 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <ImageIcon className="h-8 w-8 text-slate-500" />
          <span className="text-sm text-slate-400">Subir imagen</span>
        </button>
      )}
    </div>
  );
}
