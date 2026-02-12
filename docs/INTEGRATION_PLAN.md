# OlivoWeb Dashboard Upgrade Plan

## Resumen
Este documento rastrea la adaptación del blueprint completo al proyecto existente sin reemplazarlo. Cada módulo indica qué está hecho y qué sigue.

### Productos (Done)
- ✅ Tabla funcional con server actions y Supabase.
- ✅ Formularios Add/Edit con react-hook-form + Zod + toasts.
- 🔜 Filtros avanzados, paginación y exportaciones.

### Ventas (En progreso)
- ✅ Página con métricas + formulario Quick Sale conectado a Supabase.
- ✅ Server action `createSaleAction` y `sales.service`.
- 🔜 Detalle de productos (sale_items) y reportes POS.

### Clientes (En progreso)
- ✅ Tabla `customers` (migración 31) + server `createCustomerAction`.
- ✅ Vista `/dashboard/clientes` con listado Supabase + formulario react-hook-form.
- 🔜 Segmentación avanzada y filtros históricos.

### Reportes (En progreso)
- ✅ Secciones y placeholders para Recharts.
- 🔜 Conectar funciones Supabase/analytics.

### Infraestructura
- ✅ DashboardShell unifica navegación y estilos.
- 🔜 NextAuth + RBAC (roles `owner`, `manager`, `seller`).

### Próximos pasos inmediatos
1. Extender migración con `inventory_movements` y `alerts` para completar blueprint 4.1.
2. Implementar NextAuth con Google y poblar `app_users` + RBAC.
3. Añadir detalle de venta (productos + impuestos) y reportes Recharts conectados.
