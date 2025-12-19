import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Attachment } from '../types';

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadError: string | null;
  uploadFile: (
    file: File,
    employeeId: string,
    isPhoto: boolean
  ) => Promise<{ success: boolean; url?: string; attachment?: Attachment; error?: string }>;
  deleteFile: (storagePath: string, bucket: string) => Promise<{ success: boolean; error?: string }>;
  validateFile: (file: File, isPhoto: boolean) => { valid: boolean; error?: string };
}

/**
 * Custom hook for file upload management
 * Handles file uploads, validation, and deletion with proper error handling
 */
export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFile = useCallback((file: File, isPhoto: boolean): { valid: boolean; error?: string } => {
    // Размеры файлов (в байтах)
    const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
    
    const maxSize = isPhoto ? MAX_PHOTO_SIZE : MAX_DOCUMENT_SIZE;
    
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `Размер файла превышает ${maxSizeMB}MB`
      };
    }
    
    // Проверка типа файла для фотографий
    if (isPhoto) {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedImageTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'Разрешены только изображения: JPEG, PNG, WebP, GIF'
        };
      }
    }
    
    return { valid: true };
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    employeeId: string,
    isPhoto: boolean
  ): Promise<{ success: boolean; url?: string; attachment?: Attachment; error?: string }> => {
    if (!supabase) {
      return { success: false, error: 'Supabase не настроен' };
    }

    // Валидация файла
    const validation = validateFile(file, isPhoto);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'file';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `${employeeId}/${timestamp}_${randomSuffix}.${fileExt}`;
      
      const bucket = isPhoto ? 'employee-files' : 'employee-docs';
      const fullPath = isPhoto ? `photos/${fileName}` : `documents/${fileName}`;

      // Загружаем файл
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false // Не перезаписывать существующие файлы
        });

      if (uploadError) {
        throw uploadError;
      }

      if (!uploadData) {
        throw new Error('Не удалось загрузить файл');
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      if (isPhoto) {
        return {
          success: true,
          url: urlData.publicUrl
        };
      } else {
        // Создаем объект attachment для документов
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: uploadData.path,
          public_url: urlData.publicUrl,
          uploaded_at: new Date().toISOString()
        };

        return {
          success: true,
          url: urlData.publicUrl,
          attachment
        };
      }
    } catch (error: unknown) {
      let errorMessage = 'Ошибка при загрузке файла';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      setUploadError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  }, [validateFile]);

  const deleteFile = useCallback(async (
    storagePath: string,
    bucket: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: 'Supabase не настроен' };
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: unknown) {
      let errorMessage = 'Ошибка при удалении файла';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    isUploading,
    uploadError,
    uploadFile,
    deleteFile,
    validateFile
  };
}

