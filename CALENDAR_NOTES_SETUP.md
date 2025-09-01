# 🗓️ **Configuración de Calendar Notes en Supabase**

## 📋 **Resumen de Cambios**

Se ha creado una nueva tabla `calendar_notes` para permitir a los usuarios agregar notas, tareas y recordatorios al calendario.

## 🗄️ **Estructura de la Tabla**

```sql
CREATE TABLE public.calendar_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER NOT NULL,           -- ID del usuario (número)
    title TEXT NOT NULL,                -- Título de la nota
    content TEXT,                       -- Contenido opcional
    note_date DATE NOT NULL,            -- Fecha de la nota
    note_type TEXT DEFAULT 'note',      -- 'note', 'task', o 'reminder'
    priority TEXT DEFAULT 'medium',     -- 'low', 'medium', o 'high'
    is_completed BOOLEAN DEFAULT false, -- Estado de completado
    tags TEXT[] DEFAULT '{}',           -- Array de etiquetas
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## 🚀 **Pasos para Ejecutar la Migración**

### **1. Ejecutar el Script SQL**

En tu consola de Supabase, ejecuta el contenido del archivo:
```
supabase/migrations/20240000000004_create_calendar_notes_table.sql
```

### **2. Verificar la Creación**

```sql
-- Verificar que la tabla existe
SELECT * FROM information_schema.tables 
WHERE table_name = 'calendar_notes';

-- Verificar la estructura
\d calendar_notes

-- Verificar las políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'calendar_notes';
```

### **3. Probar la Funcionalidad**

```sql
-- Insertar una nota de prueba
INSERT INTO calendar_notes (
    user_id, 
    title, 
    note_date, 
    note_type, 
    priority
) VALUES (
    1, 
    'Nota de prueba', 
    CURRENT_DATE, 
    'note', 
    'medium'
);

-- Verificar la inserción
SELECT * FROM calendar_notes;
```

## 🔒 **Seguridad (RLS)**

- **Row Level Security**: Habilitado
- **Políticas**: Permitir acceso a usuarios autenticados
- **Validación**: A nivel de aplicación (user_id)

## 📊 **Índices Creados**

- `idx_calendar_notes_user_id` - Para consultas por usuario
- `idx_calendar_notes_note_date` - Para consultas por fecha
- `idx_calendar_notes_note_type` - Para filtros por tipo
- `idx_calendar_notes_is_completed` - Para filtros de estado

## ⚠️ **Notas Importantes**

1. **user_id**: Usa INTEGER (no UUID) para coincidir con tu sistema de usuarios
2. **Políticas RLS**: Simplificadas para permitir acceso a usuarios autenticados
3. **Triggers**: Automáticamente actualiza `updated_at` en modificaciones

## 🧪 **Pruebas Recomendadas**

1. **Crear nota**: Verificar inserción exitosa
2. **Actualizar nota**: Verificar actualización de `updated_at`
3. **Eliminar nota**: Verificar eliminación exitosa
4. **Consultas**: Verificar rendimiento con índices

## 🔧 **Solución de Problemas**

### **Error: "operator does not exist: text = uuid"**
- ✅ **Resuelto**: Cambiado `user_id` de TEXT a INTEGER
- ✅ **Resuelto**: Actualizadas políticas RLS

### **Error: "function update_updated_at_column() does not exist"**
- Verificar que la función existe en tu base de datos
- Si no existe, crear la función o comentar el trigger

## 📝 **Próximos Pasos**

1. Ejecutar la migración en Supabase
2. Probar la funcionalidad en la aplicación
3. Verificar que las notas se muestran en el calendario
4. Probar CRUD completo (Crear, Leer, Actualizar, Eliminar)

---

**¿Necesitas ayuda con algún paso específico?** 🤔
