/**
 * Утилиты для валидации файлов при загрузке
 * Защита от загрузки вредоносных файлов и файлов большого размера
 */

// === КОНСТАНТЫ ===

/** Максимальный размер файла в байтах (10 МБ) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Разрешенные MIME типы для изображений */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
] as const;

/** Разрешенные MIME типы для документов */
export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
    'text/csv',
    'image/jpeg', // .jpg, .jpeg
    'image/jpg', // .jpg
    'image/png', // .png
] as const;

/** Запрещенные расширения файлов (исполняемые и скрипты) */
const FORBIDDEN_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'scr', 'pif',
    'application', 'gadget', 'msi', 'msp',
    'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf',
    'scf', 'lnk', 'inf', 'reg',
    'dll', 'sys', 'drv'
] as const;

// === ТИПЫ ===

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    safeFileName?: string;
}

export interface FileValidationOptions {
    maxSize?: number;
    allowedTypes?: readonly string[];
    isImage?: boolean;
}

// === ОСНОВНЫЕ ФУНКЦИИ ===

/**
 * Валидирует файл перед загрузкой
 * @param file - Файл для проверки
 * @param options - Опции валидации
 * @returns Результат валидации
 */
export async function validateFile(
    file: File,
    options: FileValidationOptions = {}
): Promise<FileValidationResult> {
    const {
        maxSize = MAX_FILE_SIZE,
        allowedTypes = options.isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES,
        isImage = false
    } = options;

    // 1. Проверка размера файла
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return {
            valid: false,
            error: `Файл слишком большой. Максимальный размер: ${maxSizeMB} МБ`
        };
    }

    // 2. Проверка минимального размера (защита от пустых файлов)
    if (file.size === 0) {
        return {
            valid: false,
            error: 'Файл пустой'
        };
    }

    // 3. Проверка расширения файла
    const extension = getFileExtension(file.name);
    if (FORBIDDEN_EXTENSIONS.includes(extension.toLowerCase() as any)) {
        return {
            valid: false,
            error: `Запрещенный тип файла: .${extension}`
        };
    }

    // 4. Проверка MIME типа
    if (!allowedTypes.includes(file.type as any)) {
        return {
            valid: false,
            error: `Недопустимый формат файла. Разрешены: ${getAllowedExtensions(allowedTypes as readonly string[])}`
        };
    }

    // 5. Дополнительная проверка для изображений
    if (isImage) {
        const isValidImage = await validateImageFile(file);
        if (!isValidImage) {
            return {
                valid: false,
                error: 'Файл не является корректным изображением'
            };
        }
    }

    // 6. Генерируем безопасное имя файла
    const safeFileName = generateSafeFileName(file.name);

    return {
        valid: true,
        safeFileName
    };
}

/**
 * Проверяет, является ли файл корректным изображением
 * @param file - Файл изображения
 * @returns true если изображение валидно
 */
export function validateImageFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Проверяем минимальные размеры (защита от 1x1 пикселя)
            if (img.width < 10 || img.height < 10) {
                resolve(false);
                return;
            }

            // Проверяем максимальные размеры (защита от слишком больших изображений)
            if (img.width > 10000 || img.height > 10000) {
                resolve(false);
                return;
            }

            resolve(true);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(false);
        };

        // Таймаут для загрузки
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            resolve(false);
        }, 5000);

        img.src = objectUrl;
    });
}

/**
 * Генерирует безопасное имя файла, удаляя опасные символы
 * @param fileName - Исходное имя файла
 * @returns Безопасное имя файла
 */
export function generateSafeFileName(fileName: string): string {
    // Получаем расширение
    const extension = getFileExtension(fileName);

    // Получаем имя без расширения
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

    // Удаляем все опасные символы, оставляем только буквы, цифры, дефисы и подчеркивания
    const safeName = nameWithoutExt
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\-_\s]/g, '') // Удаляем специальные символы
        .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
        .substring(0, 100); // Ограничиваем длину

    // Если имя стало пустым, используем timestamp
    const finalName = safeName || `file_${Date.now()}`;

    return extension ? `${finalName}.${extension}` : finalName;
}

/**
 * Получает расширение файла
 * @param fileName - Имя файла
 * @returns Расширение без точки
 */
export function getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Форматирует размер файла для отображения
 * @param bytes - Размер в байтах
 * @returns Форматированная строка (например, "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Получает список разрешенных расширений из MIME типов
 * @param mimeTypes - Массив MIME типов
 * @returns Строка с расширениями (например, "JPG, PNG, PDF")
 */
function getAllowedExtensions(mimeTypes: readonly string[]): string {
    const extensionMap: Record<string, string> = {
        'image/jpeg': 'JPG',
        'image/jpg': 'JPG',
        'image/png': 'PNG',
        'image/webp': 'WEBP',
        'image/gif': 'GIF',
        'application/pdf': 'PDF',
        'application/msword': 'DOC',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
        'application/vnd.ms-excel': 'XLS',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
        'text/plain': 'TXT',
        'text/csv': 'CSV',
    };

    const extensions = mimeTypes
        .map(type => extensionMap[type])
        .filter(Boolean);

    return Array.from(new Set(extensions)).join(', ');
}

/**
 * Проверяет, является ли файл изображением по MIME типу
 * @param mimeType - MIME тип файла
 * @returns true если файл - изображение
 */
export function isImageMimeType(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType as any);
}

/**
 * Проверяет, является ли файл документом по MIME типу
 * @param mimeType - MIME тип файла
 * @returns true если файл - документ
 */
export function isDocumentMimeType(mimeType: string): boolean {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType as any);
}
