---
name: db
description: Consultas rápidas a la base de datos Supabase FDFF para depuración e inspección. Usar cuando el usuario quiera ver datos, verificar registros o diagnosticar problemas de BD.
---

Usar el MCP de Supabase para ejecutar las queries que el usuario indique.

## Reglas de seguridad (siempre aplicar)
- Solo SELECT — nunca ejecutar DELETE, UPDATE o DROP sin confirmación explícita del usuario
- Siempre añadir LIMIT 20 si el usuario no especifica un límite
- No exponer datos sensibles (cédulas, emails, teléfonos) en la respuesta — mostrar solo IDs y nombres

## Tablas principales del proyecto FDFF
- `atletas` — id, nombre, cedula, idfdff, estatus_afiliacion, sexo, preparador_id
- `competidores` — id, atleta_id, evento_cat_id, id_evento, estatus_pesaje, numero_atleta
- `eventos` — id, nombre, estado, fecha_inicio, lugar
- `eventos_categorias` — id, evento_id, categoria_id, estatus_logistica, orden_secuencia_categoria
- `categorias` — id, nombre, modalidad, disciplina, sexo, division
- `preparadores` — id, nombre_completo, gimnasio_labora, estatus_afiliacion
- `profiles` — id, nombre, role (admin|ejecutivo|juez|estadistico|atleta|preparador|fotografo|general)

## Queries frecuentes de ejemplo
```sql
-- Atletas pendientes de validar
SELECT id, nombre, idfdff, created_at FROM atletas WHERE estatus_afiliacion = 'pendiente' ORDER BY created_at DESC LIMIT 20;

-- Competidores de un evento
SELECT c.numero_atleta, a.nombre, ec.categorias(nombre) FROM competidores c JOIN atletas a ON c.atleta_id = a.id WHERE c.id_evento = 'EVENTO_ID' ORDER BY c.numero_atleta;

-- Estado actual de eventos
SELECT id, nombre, estado, fecha_inicio FROM eventos ORDER BY fecha_inicio DESC LIMIT 10;
```
