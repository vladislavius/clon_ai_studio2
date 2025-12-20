# Исправление данных департаментов и отделов

## Проблемы, которые были исправлены:

1. ✅ **ЦКП для отделов не отображался** - Исправлена загрузка `vfp` из БД для subdepartments
2. ✅ **Короткое описание департаментов не обновлялось** - Исправлена логика приоритета загрузки данных

## Что нужно сделать:

### 1. Выполнить SQL скрипт заново

Выполните `fill_all_departments_data.sql` в Supabase SQL Editor, чтобы обновить данные в базе:

```sql
-- Скрипт обновит:
-- - description (короткое описание) для всех departments
-- - long_description (полное описание) для всех departments  
-- - vfp (ЦКП) для всех departments и subdepartments
```

### 2. Перезагрузить приложение

После выполнения SQL скрипта:
1. Обновите страницу в браузере (F5 или Cmd+R)
2. Или перезапустите dev сервер (`npm run dev`)

### 3. Проверить результат

- **Для департаментов:** Короткое описание должно обновиться (без нажатия "Читать полностью")
- **Для отделов:** ЦКП должен отображаться в разделе "Ценный Конечный Продукт (ЦКП)"

## Технические детали исправлений:

### 1. Загрузка vfp для subdepartments (`hooks/useOrgStructure.ts`)

**Было:**
```typescript
dbOrg[d].departments![item.node_id] = {
  ...dbOrg[d].departments![item.node_id],
  ...content
};
```

**Стало:**
```typescript
const vfp = (item.vfp as string) || content?.vfp;
const manager = (item.manager as string) || content?.manager;
const description = (item.description as string) || content?.description;

dbOrg[d].departments![item.node_id] = {
  ...dbOrg[d].departments![item.node_id],
  ...content,
  vfp: vfp || dbOrg[d].departments![item.node_id].vfp,
  manager: manager || dbOrg[d].departments![item.node_id].manager,
  description: description || dbOrg[d].departments![item.node_id].description,
};
```

### 2. Приоритет загрузки description для departments

**Было:**
```typescript
const description = (item.description as string) || content?.description;
// ...
description: description || dbOrg[item.node_id].description,
```

**Стало:**
```typescript
// Приоритет: прямая колонка > content > дефолтное значение
const description = (item.description as string)?.trim() || content?.description || dbOrg[item.node_id].description;
// ...
description: description, // Прямое значение, без fallback
```

Теперь прямая колонка `description` из БД имеет приоритет над `content.description` из JSONB.




