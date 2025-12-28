/**
 * Утилита для парсинга материалов курса из PDF и PPTX файлов
 */

export interface ParsedImage {
  id: string;
  dataUrl: string; // base64 data URL
  alt: string;
  width?: number;
  height?: number;
}

export interface ParsedMaterial {
  fileName: string;
  title: string;
  content: string;
  order: number;
  type: 'pdf' | 'pptx';
  images: ParsedImage[]; // Изображения из файла
  pageImages?: Map<number, ParsedImage[]>; // Изображения по страницам/слайдам (для правильной вставки)
}

/**
 * Парсинг PDF файла
 * В браузерном окружении используем pdfjs-dist
 */
export async function parsePDF(file: File): Promise<ParsedMaterial> {
  try {
    // Динамический импорт pdfjs-dist для работы в браузере
    const pdfjsLib = await import('pdfjs-dist');
    
    // Настройка worker для pdfjs
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      // Используем CDN для worker или локальный файл
      const version = '3.11.174'; // Версия pdfjs-dist
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const title = file.name.replace('.pdf', '').replace(/\d+_/g, '').trim();
    const images: ParsedImage[] = [];

    // Извлекаем текст и изображения из всех страниц
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Извлекаем текст
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';

      // Извлекаем изображения со страницы через рендеринг на canvas
      // Используем меньший масштаб для оптимизации размера
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Конвертируем canvas в изображение с оптимизацией
          // Используем JPEG для меньшего размера файла
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          // Добавляем изображение страницы
          images.push({
            id: `pdf-page-${i}`,
            dataUrl,
            alt: `Страница ${i} из ${file.name}`,
            width: Math.min(viewport.width, 1200), // Ограничиваем ширину для отображения
            height: Math.min(viewport.height, 1600),
          });
        }
      } catch (err) {
        console.warn(`Ошибка при извлечении изображения страницы ${i} из PDF:`, err);
      }
    }

    // Извлекаем порядковый номер из имени файла
    const orderMatch = file.name.match(/^(\d+)/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 0;

    return {
      fileName: file.name,
      title,
      content: fullText.trim(),
      order,
      type: 'pdf',
      images,
      pageImages,
    };
  } catch (error) {
    console.error('Ошибка при парсинге PDF:', error);
    throw new Error(`Не удалось обработать PDF файл: ${file.name}`);
  }
}

/**
 * Парсинг PPTX файла
 * Для PPTX используем библиотеку для извлечения текста
 */
export async function parsePPTX(file: File): Promise<ParsedMaterial> {
  try {
    // PPTX - это ZIP архив с XML файлами
    // Используем JSZip для извлечения содержимого
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(file);
    
    const title = file.name.replace('.pptx', '').replace(/\d+_/g, '').trim();
    const images: ParsedImage[] = [];
    const slideImages = new Map<number, ParsedImage[]>();
    const slideTexts: string[] = [];

    // Ищем файлы слайдов (обычно в ppt/slides/slide*.xml)
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    );

    // Сортируем слайды по номеру
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

    // Извлекаем изображения из папки ppt/media/ и создаем карту
    const mediaFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/media/') && 
      (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif'))
    );

    const imageMap = new Map<string, ParsedImage>();
    for (const mediaPath of mediaFiles) {
      const mediaFile = zip.files[mediaPath];
      if (!mediaFile) continue;
      
      try {
        const imageData = await mediaFile.async('blob');
        const arrayBuffer = await imageData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = mediaPath.endsWith('.png') ? 'image/png' : 
                        mediaPath.endsWith('.jpg') || mediaPath.endsWith('.jpeg') ? 'image/jpeg' : 
                        'image/gif';
        
        const img = new Image();
        img.src = `data:${mimeType};base64,${base64}`;
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const parsedImage: ParsedImage = {
          id: `pptx-img-${mediaPath.split('/').pop()}`,
          dataUrl: `data:${mimeType};base64,${base64}`,
          alt: `Изображение из ${mediaPath.split('/').pop()}`,
          width: img.width,
          height: img.height,
        };
        
        images.push(parsedImage);
        imageMap.set(mediaPath, parsedImage);
      } catch (err) {
        console.warn('Ошибка при извлечении изображения из PPTX:', err);
      }
    }

    // Извлекаем текст из каждого слайда и связываем с изображениями
    for (let slideIndex = 0; slideIndex < slideFiles.length; slideIndex++) {
      const slidePath = slideFiles[slideIndex];
      const slideFile = zip.files[slidePath];
      if (!slideFile) continue;
      
      const slideContent = await slideFile.async('string');
      
      // Извлекаем текст с лучшим форматированием
      const textMatches = slideContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const slideText = textMatches
        .map(match => match.replace(/<[^>]+>/g, ''))
        .filter(text => text.trim())
        .join('\n')
        .trim();
      
      slideTexts.push(slideText || '');

      // Ищем изображения, связанные с этим слайдом
      const slideNumber = slideIndex + 1;
      const slideImagesList: ParsedImage[] = [];
      
      // Ищем ссылки на изображения в содержимом слайда
      const imageRefs = slideContent.match(/r:embed="[^"]+"/g) || [];
      for (const ref of imageRefs) {
        const relId = ref.match(/r:embed="([^"]+)"/)?.[1];
        if (relId) {
          // Ищем в relationships файле
          const relsPath = `ppt/slides/_rels/${slidePath.split('/').pop()}.rels`;
          const relsFile = zip.files[relsPath];
          if (relsFile) {
            try {
              const relsContent = await relsFile.async('string');
              const targetMatch = relsContent.match(new RegExp(`Id="${relId}"[^>]*Target="([^"]+)"`));
              if (targetMatch) {
                const imagePath = `ppt/${targetMatch[1]}`;
                const image = imageMap.get(imagePath);
                if (image) {
                  slideImagesList.push(image);
                }
              }
            } catch (err) {
              // Игнорируем ошибки при поиске связей
            }
          }
        }
      }
      
      // Если не нашли связи, но есть изображения, распределяем их равномерно
      if (slideImagesList.length === 0 && images.length > 0) {
        const imagesPerSlide = Math.ceil(images.length / slideFiles.length);
        const startIndex = slideIndex * imagesPerSlide;
        const endIndex = Math.min(startIndex + imagesPerSlide, images.length);
        slideImagesList.push(...images.slice(startIndex, endIndex));
      }
      
      if (slideImagesList.length > 0) {
        slideImages.set(slideNumber, slideImagesList);
      }
    }
    
    // Объединяем текст всех слайдов с разделителями
    const fullText = slideTexts
      .map((text, index) => text || `--- Слайд ${index + 1} ---`)
      .join('\n\n--- Слайд ---\n\n');

    // Извлекаем порядковый номер из имени файла
    const orderMatch = file.name.match(/^(\d+)/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 0;

    return {
      fileName: file.name,
      title,
      content: fullText.trim(),
      order,
      type: 'pptx',
      images,
      pageImages: slideImages,
    };
  } catch (error) {
    console.error('Ошибка при парсинге PPTX:', error);
    throw new Error(`Не удалось обработать PPTX файл: ${file.name}`);
  }
}

/**
 * Парсинг всех файлов из папки
 */
export async function parseCourseMaterials(files: File[]): Promise<ParsedMaterial[]> {
  const results: ParsedMaterial[] = [];

  for (const file of files) {
    try {
      let parsed: ParsedMaterial;
      
      if (file.name.endsWith('.pdf')) {
        parsed = await parsePDF(file);
      } else if (file.name.endsWith('.pptx')) {
        parsed = await parsePPTX(file);
      } else {
        console.warn(`Неподдерживаемый формат файла: ${file.name}`);
        continue;
      }

      results.push(parsed);
    } catch (error) {
      console.error(`Ошибка при обработке файла ${file.name}:`, error);
    }
  }

  // Сортируем по порядковому номеру
  return results.sort((a, b) => a.order - b.order);
}

/**
 * Конвертация распарсенного материала в HTML для отображения
 */
export function materialToHTML(material: ParsedMaterial): string {
  // Разбиваем контент на части (страницы/слайды)
  const parts = material.content.split(/\n\n---\s*(?:Страница|Слайд)\s*---\n\n/);
  
  let html = `
    <div class="course-material" data-type="${material.type}" data-order="${material.order}">
      <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1.5rem; color: #1e293b; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0;">
        ${material.title}
      </h2>
  `;

  // Обрабатываем каждую часть (страницу/слайд)
  for (let i = 0; i < parts.length; i++) {
    const partText = parts[i].trim();
    if (!partText) continue;

    const pageNumber = i + 1;
    
    // Форматируем текст части
    const paragraphs = partText
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const trimmed = line.trim();
        // Определяем заголовки (если строка короткая и в верхнем регистре или с особым форматированием)
        if (trimmed.length < 100 && (trimmed === trimmed.toUpperCase() || trimmed.match(/^[А-ЯЁ]/))) {
          return `<h3 style="font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #334155;">${trimmed}</h3>`;
        }
        return `<p style="margin-bottom: 1rem; line-height: 1.6; color: #475569;">${trimmed}</p>`;
      })
      .join('\n');

    html += `
      <div class="course-part" data-page="${pageNumber}" style="margin-bottom: 2.5rem;">
        <div class="course-text" style="margin-bottom: 1.5rem;">
          ${paragraphs}
        </div>
    `;

    // Добавляем изображения для этой страницы/слайда
    if (material.pageImages && material.pageImages.has(pageNumber)) {
      const pageImages = material.pageImages.get(pageNumber) || [];
      
      for (const img of pageImages) {
        let maxWidth = '100%';
        if (img.width) {
          if (img.width > 1200) {
            maxWidth = '1200px';
          } else if (img.width > 800) {
            maxWidth = '800px';
          } else {
            maxWidth = `${Math.min(img.width, 800)}px`;
          }
        }
        
        html += `
          <figure class="course-image" style="margin: 2rem 0; text-align: center; page-break-inside: avoid;">
            <img 
              src="${img.dataUrl}" 
              alt="${img.alt}" 
              style="max-width: ${maxWidth}; width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: block; margin: 0 auto; cursor: pointer;"
              loading="lazy"
              onclick="this.style.transform = this.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)'; this.style.transition = 'transform 0.3s ease';"
            />
            <figcaption style="margin-top: 0.75rem; font-size: 0.875rem; color: #64748b; font-style: italic; max-width: ${maxWidth}; margin-left: auto; margin-right: auto;">
              ${img.alt}
            </figcaption>
          </figure>
        `;
      }
    }

    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

