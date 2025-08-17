# 🔧 Guía de Restauración de Datos - Tienda Web

## Problema: Datos Perdidos del Usuario

Si has perdido la información del usuario (direcciones, apellidos editados, pedidos realizados), esto puede ocurrir por:

- Cambio de puerto del servidor (3000 → 3001)
- Limpieza del localStorage del navegador
- Errores en la aplicación
- Reinicio del navegador con configuraciones específicas

## 🚀 Solución Rápida

### Método 1: Restauración Automática
Los datos ahora se restauran automáticamente cuando no existe información en localStorage. Solo recarga la página en las siguientes secciones:

- **Mi Cuenta** → Se restaurará el perfil del usuario
- **Mis Pedidos** → Se cargarán pedidos de ejemplo
- **Mis Direcciones** → Se añadirán direcciones de ejemplo

### Método 2: Restauración Manual (Consola del Navegador)

1. **Abre las herramientas de desarrollo** del navegador:
   - Chrome/Firefox: `F12` o `Ctrl+Shift+I`
   - Safari: `Cmd+Opt+I`

2. **Ve a la pestaña "Console"**

3. **Ejecuta uno de estos comandos:**

```javascript
// Restaurar todos los datos de ejemplo
restoreDefaultData();

// O si quieres limpiar todo y empezar de nuevo
clearAllData();
```

4. **Recarga la página** después de ejecutar el comando

## 📋 Datos que se Restauran

### Perfil de Usuario
- **Nombre:** Juan
- **Apellidos:** Pérez González  
- **Email:** juan.perez@example.com
- **Teléfono:** 555-123-4567

### Pedidos de Ejemplo
1. **ORD-2025-001** - $129.99 - Entregado (2 productos)
2. **ORD-2025-002** - $89.50 - En tránsito (1 producto)
3. **ORD-2025-003** - $199.99 - Procesando (3 productos)
4. **ORD-2025-004** - $45.00 - Entregado (1 producto)

### Direcciones de Ejemplo
1. **Casa:** Av. Insurgentes Sur 1234, Roma Norte, CDMX
2. **Oficina:** Paseo de la Reforma 567, Juárez, CDMX

## 🛠️ Para Desarrolladores

El sistema de persistencia mejorado incluye:

- **Hook personalizado `useLocalStorage`** con datos de respaldo
- **Validación automática** de datos corruptos en el carrito
- **Restauración automática** cuando no hay datos guardados
- **Funciones de utilidad** para desarrollo disponibles en consola

### Archivos Modificados:
- `src/hooks/useLocalStorage.ts` - Hook para persistencia robusta
- `src/utils/dataRestoration.ts` - Funciones de restauración
- `src/app/mi-cuenta/page.tsx` - Página principal con datos de respaldo
- `src/app/mi-cuenta/pedidos/page.tsx` - Pedidos con datos de ejemplo
- `src/app/mi-cuenta/direcciones/page.tsx` - Direcciones con datos de ejemplo
- `src/app/mi-cuenta/informacion-personal/page.tsx` - Perfil con persistencia mejorada

## 🔄 Cómo Funciona la Restauración Automática

1. **Al cargar cada página**, se verifica si existen datos en localStorage
2. **Si no hay datos**, se cargan automáticamente los datos de ejemplo
3. **Los datos se guardan** en localStorage para futuras visitas
4. **Las ediciones del usuario** sobrescriben los datos de ejemplo

## ✅ Verificar que Funciona

Después de la restauración, verifica:

- [ ] **Mi Cuenta** muestra "Juan Pérez González"
- [ ] **Mis Pedidos** muestra 4 pedidos de ejemplo
- [ ] **Mis Direcciones** muestra 2 direcciones (Casa y Oficina)
- [ ] **Información Personal** pre-carga los datos del perfil
- [ ] **Nuevos pedidos** se guardan después del checkout
- [ ] **Ediciones del perfil** se mantienen entre sesiones

## 🆘 Si Aún Tienes Problemas

1. **Limpia completamente el localStorage:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Verifica el puerto correcto:** http://localhost:3001

3. **Revisa la consola** del navegador en busca de errores

4. **Reinicia el servidor de desarrollo** si es necesario
