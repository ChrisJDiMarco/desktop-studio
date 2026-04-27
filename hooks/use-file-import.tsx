"use client";

import { useState, useCallback, useRef } from "react";

interface FileItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface UseFileImportConfig {
  acceptedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (file: File, url: string) => void;
  onError?: (error: string) => void;
}

export function useFileImport(config: UseFileImportConfig = {}) {
  const { acceptedTypes, maxSize = 10 * 1024 * 1024, maxFiles = 10, onUpload, onError } = config;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (files.length >= maxFiles) {
        const msg = `Maximum ${maxFiles} files allowed`;
        setError(msg);
        onError?.(msg);
        return;
      }

      if (file.size > maxSize) {
        const msg = `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
        setError(msg);
        onError?.(msg);
        return;
      }

      if (acceptedTypes && acceptedTypes.length > 0) {
        const matches = acceptedTypes.some((t) => {
          if (t.endsWith("/*")) return file.type.startsWith(t.replace("/*", "/"));
          return file.type === t;
        });
        if (!matches) {
          const msg = "File type not accepted";
          setError(msg);
          onError?.(msg);
          return;
        }
      }

      setIsUploading(true);
      try {
        const url = URL.createObjectURL(file);
        const item: FileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          url,
          type: file.type,
          size: file.size,
        };
        setFiles((prev) => [...prev, item]);
        onUpload?.(file, url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        onError?.(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [files.length, maxFiles, maxSize, acceptedTypes, onUpload, onError]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.url);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url));
      return [];
    });
  }, []);

  return { files, isUploading, error, uploadFile, removeFile, clearFiles, inputRef };
}
