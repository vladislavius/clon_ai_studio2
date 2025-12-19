# 📁 Руководство по работе с файлами в HR System Pro

## 📋 Содержание

1. [Обзор системы хранения файлов](#обзор-системы-хранения-файлов)
2. [Использование хука useFileUpload](#использование-хука-usefileupload)
3. [Интеграция в компоненты](#интеграция-в-компоненты)
4. [Безопасность и валидация](#безопасность-и-валидация)
5. [Управление файлами](#управление-файлами)

---

## Обзор системы хранения файлов

### Storage Buckets

В системе используются два bucket'а:

1. **`employee-files`** — для фотографий сотрудников
   - Лимит размера: **5MB**
   - Разрешенные типы: JPEG, PNG, WebP, GIF
   - Путь: `photos/{employee_id}/{timestamp}_{random}.{ext}`

2. **`employee-docs`** — для документов сотрудников
   - Лимит размера: **10MB**
   - Разрешенные типы: PDF, DOC, DOCX, ZIP, изображения
   - Путь: `documents/{employee_id}/{timestamp}_{random}.{ext}`

### Безопасность

- ✅ Все файлы защищены RLS политиками
- ✅ Чтение доступно всем авторизованным пользователям
- ✅ Загрузка/удаление доступны только администраторам
- ✅ Автоматическая валидация размера и типа файла

---

## Использование хука useFileUpload

### Базовый пример

```typescript
import { useFileUpload } from '../hooks/useFileUpload';

function MyComponent() {
  const { uploadFile, deleteFile, validateFile, isUploading, uploadError } = useFileUpload();

  const handleUpload = async (file: File, employeeId: string) => {
    // Валидация перед загрузкой
    const validation = validateFile(file, false); // false = документ
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Загрузка файла
    const result = await uploadFile(file, employeeId, false);
    
    if (result.success && result.attachment) {
      // Сохранить attachment в БД
      console.log('Файл загружен:', result.attachment);
    } else {
      console.error('Ошибка:', result.error);
    }
  };

  return (
    <div>
      {isUploading && <p>Загрузка...</p>}
      {uploadError && <p>Ошибка: {uploadError}</p>}
      {/* ... */}
    </div>
  );
}
```

### API хука

#### `uploadFile(file, employeeId, isPhoto)`

Загружает файл в Supabase Storage.

**Параметры:**
- `file: File` — файл для загрузки
- `employeeId: string` — ID сотрудника
- `isPhoto: boolean` — `true` для фотографий, `false` для документов

**Возвращает:**
```typescript
{
  success: boolean;
  url?: string;           // Публичный URL (для фотографий)
  attachment?: Attachment; // Объект attachment (для документов)
  error?: string;         // Сообщение об ошибке
}
```

#### `deleteFile(storagePath, bucket)`

Удаляет файл из Storage.

**Параметры:**
- `storagePath: string` — путь к файлу в storage
- `bucket: string` — имя bucket'а (`'employee-files'` или `'employee-docs'`)

**Возвращает:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### `validateFile(file, isPhoto)`

Валидирует файл перед загрузкой.

**Параметры:**
- `file: File` — файл для проверки
- `isPhoto: boolean` — тип файла

**Возвращает:**
```typescript
{
  valid: boolean;
  error?: string;
}
```

---

## Интеграция в компоненты

### Пример: Загрузка фотографии сотрудника

```typescript
import { useFileUpload } from '../hooks/useFileUpload';

function EmployeePhotoUpload({ employeeId, onPhotoUploaded }) {
  const { uploadFile, isUploading, validateFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация
    const validation = validateFile(file, true);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Загрузка
    const result = await uploadFile(file, employeeId, true);
    
    if (result.success && result.url) {
      onPhotoUploaded(result.url);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        {isUploading ? 'Загрузка...' : 'Загрузить фото'}
      </button>
    </>
  );
}
```

### Пример: Загрузка документа

```typescript
function DocumentUpload({ employeeId, onDocumentUploaded }) {
  const { uploadFile, deleteFile, isUploading, validateFile } = useFileUpload();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleUpload = async (file: File) => {
    const validation = validateFile(file, false);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const result = await uploadFile(file, employeeId, false);
    
    if (result.success && result.attachment) {
      setAttachments(prev => [...prev, result.attachment!]);
      onDocumentUploaded(result.attachment);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    const bucket = attachment.storage_path.startsWith('photos/') 
      ? 'employee-files' 
      : 'employee-docs';
    
    const result = await deleteFile(attachment.storage_path, bucket);
    
    if (result.success) {
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      // Также удалить из БД через API
    }
  };

  return (
    <div>
      {/* UI для загрузки и отображения файлов */}
    </div>
  );
}
```

---

## Безопасность и валидация

### Автоматическая валидация

Хук автоматически проверяет:

1. **Размер файла:**
   - Фотографии: максимум 5MB
   - Документы: максимум 10MB

2. **Тип файла:**
   - Фотографии: только изображения (JPEG, PNG, WebP, GIF)
   - Документы: PDF, DOC, DOCX, ZIP, изображения

3. **Права доступа:**
   - Только администраторы могут загружать/удалять файлы
   - Проверка через RLS политики в Supabase

### Обработка ошибок

```typescript
const result = await uploadFile(file, employeeId, false);

if (!result.success) {
  // Обработка ошибки
  switch (result.error) {
    case 'Размер файла превышает 10MB':
      // Показать сообщение пользователю
      break;
    case 'Разрешены только изображения...':
      // Показать сообщение о типе файла
      break;
    default:
      // Общая ошибка
      console.error('Ошибка загрузки:', result.error);
  }
}
```

---

## Управление файлами

### Поиск orphaned файлов

Если нужно найти файлы без записей в БД:

```sql
SELECT * FROM public.find_orphaned_files();
```

Эта функция вернет список файлов, которые есть в storage, но нет в таблице `employee_attachments`.

### Получение размера файлов сотрудника

```sql
SELECT public.get_employee_files_size('employee-uuid-here');
```

Вернет общий размер всех файлов сотрудника в байтах.

### Удаление файлов

**Через хук (рекомендуется):**
```typescript
const { deleteFile } = useFileUpload();
await deleteFile(storagePath, bucket);
```

**Через Supabase API напрямую:**
```typescript
await supabase.storage
  .from('employee-docs')
  .remove([storagePath]);
```

---

## Рекомендации

### ✅ Лучшие практики

1. **Всегда валидируйте файлы перед загрузкой:**
   ```typescript
   const validation = validateFile(file, isPhoto);
   if (!validation.valid) {
     // Показать ошибку, не загружать
     return;
   }
   ```

2. **Показывайте прогресс загрузки:**
   ```typescript
   {isUploading && <ProgressBar />}
   ```

3. **Обрабатывайте ошибки:**
   ```typescript
   if (!result.success) {
     // Показать понятное сообщение пользователю
   }
   ```

4. **Удаляйте файлы при удалении attachment:**
   ```typescript
   // При удалении attachment из БД
   await deleteFile(attachment.storage_path, bucket);
   ```

### ⚠️ Важные моменты

1. **Не храните файлы локально** — всегда используйте Supabase Storage
2. **Проверяйте права администратора** перед загрузкой/удалением
3. **Используйте уникальные имена файлов** — хук автоматически добавляет timestamp и random suffix
4. **Регулярно проверяйте orphaned файлы** и очищайте их

---

## Примеры использования

### Полный пример компонента загрузки

```typescript
import React, { useRef, useState } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { Attachment } from '../types';
import { Upload, X, File } from 'lucide-react';

interface FileUploadProps {
  employeeId: string;
  onFileUploaded: (attachment: Attachment) => void;
  onFileDeleted: (attachmentId: string) => void;
  existingAttachments?: Attachment[];
}

export function FileUploadComponent({
  employeeId,
  onFileUploaded,
  onFileDeleted,
  existingAttachments = []
}: FileUploadProps) {
  const { uploadFile, deleteFile, validateFile, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация
    const validation = validateFile(file, false);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Загрузка
    const result = await uploadFile(file, employeeId, false);
    
    if (result.success && result.attachment) {
      onFileUploaded(result.attachment);
    } else {
      alert(result.error || 'Ошибка загрузки файла');
    }

    // Очистка input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Удалить файл ${attachment.file_name}?`)) return;

    const bucket = attachment.storage_path.startsWith('photos/')
      ? 'employee-files'
      : 'employee-docs';

    const result = await deleteFile(attachment.storage_path, bucket);
    
    if (result.success) {
      onFileDeleted(attachment.id);
    } else {
      alert(result.error || 'Ошибка удаления файла');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.zip,image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {isUploading ? 'Загрузка...' : (
            <>
              <Upload size={16} className="inline mr-2" />
              Загрузить файл
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        {existingAttachments.map(attachment => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <File size={20} />
              <div>
                <p className="font-medium">{attachment.file_name}</p>
                <p className="text-sm text-gray-500">
                  {(attachment.file_size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={attachment.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Открыть
              </a>
              <button
                onClick={() => handleDelete(attachment)}
                className="text-red-600 hover:text-red-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Устранение проблем

### Файл не загружается

1. Проверьте размер файла (должен быть меньше лимита)
2. Проверьте тип файла (должен быть в списке разрешенных)
3. Проверьте права администратора
4. Проверьте консоль браузера на ошибки

### Файл не удаляется

1. Проверьте, что вы администратор
2. Проверьте правильность `storage_path`
3. Проверьте правильность имени bucket'а

### Ошибка "Bucket not found"

Убедитесь, что buckets созданы в Supabase:
- `employee-files`
- `employee-docs`

Выполните схему `supabase_schema_complete.sql` для создания buckets.

---

**Готово!** Теперь вы можете безопасно работать с файлами в вашем приложении. 🎉

