# 🎨 Sistema de Configuración Completo - OLIVOMARKET

## ✨ Características

Este sistema de configuración permite personalizar **completamente** tu tienda online desde el panel de administración:

### 📦 Módulos Implementados

- ✅ **General** - Información de la tienda (nombre, email, teléfono, dirección, moneda, idioma)
- ✅ **Apariencia** - Colores personalizados, logo, favicon, banner, modo oscuro
- ✅ **Envíos** - Envío gratis, entrega local, envío internacional
- ✅ **Pagos** - Métodos de pago (tarjetas, PayPal, transferencia, etc)
- ✅ **Emails** - Configuración de notificaciones automáticas
- ✅ **Redes Sociales** - Enlaces a Facebook, Instagram, Twitter, WhatsApp, etc
- ✅ **SEO** - Meta tags, Open Graph, keywords
- ✅ **Política** - Enlaces a términos, privacidad, FAQs, modo mantenimiento

### 🎯 Funcionalidades Destacadas

1. **Colores Dinámicos** - Los colores configurados se aplican automáticamente en todo el sitio
2. **Banner Personalizado** - Sube tu propia imagen de banner para la página principal
3. **Footer Dinámico** - El footer se actualiza con la información de contacto configurada
4. **Redes Sociales** - Enlaces automáticos en el footer
5. **SEO Automático** - Meta tags y Open Graph se actualizan dinámicamente
6. **Validaciones** - Límites de caracteres para SEO (60 para título, 160 para descripción)
7. **UI Elegante** - Diseño moderno con tabs laterales y secciones colapsables

## 🚀 Instalación

### Paso 1: Ejecutar la migración SQL

Necesitas crear la tabla `settings` en tu base de datos Supabase:

#### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. Abre tu proyecto en https://supabase.com
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia el contenido de `supabase/28_create_settings_table.sql`
5. Ejecuta el script (Run)

#### Opción B: Con el cliente de Node.js

```bash
node scripts/run-settings-migration.js
```

⚠️ **Nota**: Si obtienes errores, usa la Opción A (Dashboard).

### Paso 2: Verificar la instalación

1. Abre el panel de administración: `/admin/configuracion`
2. Verifica que puedas ver todas las pestañas
3. Intenta guardar algún cambio

## 📖 Uso

### Desde el Panel Admin

1. Ve a `/admin/configuracion`
2. Selecciona la pestaña que quieras configurar
3. Realiza los cambios necesarios
4. Haz clic en **Guardar cambios**
5. Los cambios se aplicarán automáticamente en todo el sitio

### Desde el Código

#### Obtener configuraciones en cualquier componente

```tsx
import { useStoreSettings } from "@/hooks/useStoreSettings";

function MiComponente() {
  const { settings, loading, error } = useStoreSettings();

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{settings.storeName}</h1>
      <p>{settings.storeEmail}</p>
    </div>
  );
}
```

#### Hooks especializados

```tsx
// Solo apariencia
import { useAppearanceSettings } from "@/hooks/useStoreSettings";
const { appearance } = useAppearanceSettings();

// Solo envíos
import { useShippingSettings } from "@/hooks/useStoreSettings";
const { shipping } = useShippingSettings();

// Solo pagos
import { usePaymentSettings } from "@/hooks/useStoreSettings";
const { paymentMethods, paymentTestMode } = usePaymentSettings();

// Solo SEO
import { useSeoSettings } from "@/hooks/useStoreSettings";
const { seo } = useSeoSettings();

// Solo redes sociales
import { useSocialMediaSettings } from "@/hooks/useStoreSettings";
const { socialMedia } = useSocialMediaSettings();
```

### API REST

#### GET /api/admin/settings

Obtiene todas las configuraciones de la tienda.

```bash
curl https://tudominio.com/api/admin/settings
```

**Respuesta:**

```json
{
  "storeName": "OLIVOMARKET",
  "storeEmail": "contacto@olivomarket.cl",
  "currency": "CLP",
  "appearance": {
    "primaryColor": "#10B981",
    "secondaryColor": "#059669",
    "logoUrl": "/logo.png",
    "bannerUrl": "/banner.jpg"
  },
  "shipping": {
    "enableShipping": true,
    "freeShippingEnabled": true,
    "freeShippingMinimum": 50000
  },
  ...
}
```

#### PATCH /api/admin/settings

Actualiza configuraciones (requiere autenticación como admin).

```bash
curl -X PATCH https://tudominio.com/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{
    "storeName": "Mi Nueva Tienda",
    "appearance": {
      "primaryColor": "#FF5733"
    }
  }'
```

## 🎨 Personalización de Colores

Los colores se aplican automáticamente como **CSS Variables**:

```css
:root {
  --color-primary: #10B981;
  --color-secondary: #059669;
  --color-accent: #047857;
  --color-footer-bg: #1F2937;
  --color-footer-text: #F3F4F6;
}
```

Puedes usar estas variables en tu CSS:

```css
.mi-boton {
  background-color: var(--color-primary);
  color: white;
}

.mi-badge {
  background-color: var(--color-accent);
}
```

O en componentes de React:

```tsx
<div
  style={{
    backgroundColor: "var(--color-primary)",
    color: "white",
  }}
>
  Mi contenido
</div>
```

## 🔐 Seguridad

- ✅ Solo usuarios con rol **ADMIN** pueden modificar la configuración
- ✅ Todas las peticiones PATCH requieren sesión autenticada
- ✅ Validaciones en el backend para tipos de datos

## 📊 Estructura de la Base de Datos

La tabla `settings` contiene una única fila con `id = true`:

```sql
CREATE TABLE public.settings (
  id boolean PRIMARY KEY DEFAULT true,
  
  -- General
  store_name VARCHAR(255),
  store_email VARCHAR(255),
  store_phone VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'CLP',
  
  -- Apariencia
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  logo_url TEXT,
  banner_url TEXT,
  
  -- Envíos
  enable_shipping BOOLEAN DEFAULT true,
  free_shipping_enabled BOOLEAN,
  free_shipping_minimum DECIMAL(10, 2),
  
  -- Pagos
  payment_methods JSONB,
  payment_test_mode BOOLEAN DEFAULT true,
  
  -- Emails
  order_confirmation_enabled BOOLEAN DEFAULT true,
  marketing_emails_enabled BOOLEAN DEFAULT false,
  
  -- Redes Sociales
  social_media JSONB,
  
  -- SEO
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🐛 Solución de Problemas

### Error: "Table 'settings' doesn't exist"

**Solución**: Ejecuta la migración SQL desde el dashboard de Supabase.

### Error: "No autorizado"

**Solución**: Asegúrate de estar logueado como administrador.

### Los colores no se aplican

**Solución**: 
1. Verifica que `SettingsInjector` esté importado en `layout.tsx`
2. Refresca la página después de guardar cambios
3. Limpia la caché del navegador

### El banner no se muestra

**Solución**:
1. Verifica que la URL del banner sea válida
2. Sube la imagen usando el componente `SingleImageUpload`
3. Verifica que el archivo se subió correctamente a Supabase Storage

## 🔄 Próximas Mejoras

- [ ] Conectar envíos con el carrito de compras
- [ ] Integrar métodos de pago con pasarelas reales
- [ ] Sistema de emails transaccionales con SendGrid/Resend
- [ ] Panel de previsualización en tiempo real
- [ ] Historial de cambios de configuración
- [ ] Exportar/Importar configuración completa

## 📝 Changelog

### v1.0.0 (2025-11-20)

- ✅ Sistema de configuración completo
- ✅ API REST para settings
- ✅ Hooks personalizados
- ✅ Colores dinámicos con CSS variables
- ✅ UI moderna y elegante
- ✅ Footer dinámico con redes sociales
- ✅ Meta tags SEO automáticos
- ✅ Validaciones y límites de caracteres

## 👨‍💻 Soporte

Si encuentras algún problema o tienes sugerencias, por favor:

1. Revisa esta documentación
2. Verifica que la migración SQL se ejecutó correctamente
3. Limpia la caché del navegador
4. Consulta los logs del servidor

---

**¡Disfruta personalizando tu tienda! 🎉**
