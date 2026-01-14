# Propuesta: Tabla Compacta + Panel Lateral

## Problema actual:
- Tabla muy ancha con muchas columnas
- Doble scroll (horizontal y vertical)  
- Difícil de usar en pantallas normales
- Inputs inline hacen la tabla confusa

## Solución propuesta:

### Tabla principal (SIN scroll horizontal):
```
| ☐ | ☐ | Estado | Producto (nombre + código) | Categoría | Precio | [Botón Editar] |
```

**Solo 7 columnas** vs las 15+ actuales


### Panel lateral para editar:
Al hacer clic en "Editar", se abre un panel desde la derecha con:
- Todos los campos organizados por secciones
- Scroll vertical solo dentro del panel
- Inputs más grandes y cómodos
- Botón "Guardar" al final

## Ventajas:
✅ **CERO scroll horizontal** - La tabla cabe en cualquier pantalla
✅ **Edición más cómoda** - Inputs grandes, bien organizados
✅ **Más rápido** - Ver muchos productos de un vistazo
✅ **Menos errores** - No te pierdes entre columnas
✅ **Moderno** - Patrón usado por apps como Gmail, Notion, Trello

## ¿Implemento esta solución?
Responde "sí" para que lo implemente, o "no" si prefieres otra cosa.
