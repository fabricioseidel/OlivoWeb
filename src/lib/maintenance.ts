/**
 * Modo mantenimiento: la tienda pública entera fuera de línea.
 *
 * Distinto del modo vitrina (`store-status.ts`), que deja navegar el catálogo
 * y sólo impide pagar. Acá el cliente no ve nada salvo el aviso.
 *
 * Lo que NO se baja, a propósito: el panel (`/admin`), el acceso (`/login`),
 * la app de operaciones y las APIs que usan. Si el mantenimiento bloqueara el
 * panel, no habría cómo apagarlo sin entrar a la base de datos.
 *
 * Este archivo no importa nada de Next ni de Supabase para poder usarse desde
 * el middleware (edge) y probarse solo.
 */

export const MAINTENANCE_DEFAULT_MESSAGE =
  "Estamos haciendo mejoras en la tienda. Volvemos muy pronto.";

/** Rutas que siguen funcionando con el mantenimiento activado. */
const PREFIJOS_EXENTOS = [
  "/admin",
  "/login",
  "/recuperar-password",
  "/operaciones",
  "/uber-eats-editor",
  "/api/admin",
  "/api/auth",
  // Los pagos ya iniciados tienen que poder terminar de avisar su resultado,
  // y las tareas programadas (cierre automático de turnos) no dependen de la
  // tienda pública.
  "/api/webhooks",
  "/api/cron",
  "/api/settings",
];

function coincide(pathname: string, prefijo: string): boolean {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`);
}

/** true si la ruta debe responder "en mantenimiento" cuando el modo está activo. */
export function bloqueadaPorMantenimiento(pathname: string): boolean {
  return !PREFIJOS_EXENTOS.some((p) => coincide(pathname, p));
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Página de mantenimiento autocontenida. Se sirve directo desde el middleware
 * y no como una ruta de la app: así no arrastra el encabezado, el carrito ni
 * nada que consulte la base, y funciona aunque el resto del sitio esté roto.
 */
export function paginaMantenimiento(mensaje?: string | null): string {
  const texto = escaparHtml(mensaje?.trim() || MAINTENANCE_DEFAULT_MESSAGE);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Olivo Market — En mantenimiento</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    padding:24px;background:#f4f7f1;color:#1f2a1c;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{max-width:460px;width:100%;text-align:center;background:#fff;border:1px solid #dfe7d8;
    border-radius:24px;padding:40px 28px}
  .marca{font-size:13px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#4d7c0f}
  h1{font-size:28px;line-height:1.15;margin:16px 0 12px}
  p{font-size:16px;line-height:1.55;margin:0;color:#4a5646}
  @media (prefers-color-scheme:dark){
    body{background:#10140e;color:#eef3ea}
    main{background:#181e15;border-color:#2a3325}
    p{color:#b4c0ad}
    .marca{color:#a3e635}
  }
</style>
</head>
<body>
<main>
  <div class="marca">Olivo Market</div>
  <h1>Estamos en mantenimiento</h1>
  <p>${texto}</p>
</main>
</body>
</html>`;
}
