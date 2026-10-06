/**
 * Correo del cupón de la ganadora del concurso.
 *
 * HTML con estilos en línea y tablas: es lo único que renderizan igual Gmail,
 * Outlook y Apple Mail. Sin imágenes externas, para que no dependa de que el
 * cliente de correo las cargue.
 */

export type CuponGanadoraData = {
  nombre: string;
  codigo: string;
  /** Valor tope del cupón, en CLP. */
  monto: number;
  /** Vigencia opcional, ya formateada ("31 de diciembre de 2026"). */
  vigencia?: string;
  /** URL de la tienda. */
  tiendaUrl?: string;
};

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function asuntoCuponGanadora(nombre: string): string {
  return `🎉 ${nombre}, ¡ganaste! Tu cupón OlivoMarket te espera`;
}

export function renderCuponGanadoraHtml(d: CuponGanadoraData): string {
  const url = d.tiendaUrl || "https://olivomarket.cl";
  const nombre = esc(d.nombre);
  const codigo = esc(d.codigo);

  const paso = (n: number, titulo: string, texto: string) => `
    <tr>
      <td style="padding:0 0 14px;vertical-align:top;width:36px;">
        <div style="width:28px;height:28px;border-radius:14px;background:#059669;color:#ffffff;font-size:14px;font-weight:700;line-height:28px;text-align:center;">${n}</div>
      </td>
      <td style="padding:0 0 14px;vertical-align:top;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#1f2937;">${titulo}</p>
        <p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">${texto}</p>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ganaste tu cupón OlivoMarket</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Ganaste ${clp(d.monto)} para tu primera compra: carrito a $0, sólo pagas el envío.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">

      <!-- Cabecera -->
      <tr><td align="center" style="background:#064e3b;background-image:linear-gradient(135deg,#064e3b 0%,#059669 100%);padding:40px 28px 34px;">
        <p style="margin:0;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#a7f3d0;font-weight:600;">OlivoMarket</p>
        <p style="margin:18px 0 0;font-size:44px;line-height:1;">🎉</p>
        <h1 style="margin:14px 0 0;font-size:30px;line-height:1.2;color:#ffffff;font-weight:800;">¡Felicitaciones, ${nombre}!</h1>
        <p style="margin:10px 0 0;font-size:16px;line-height:1.5;color:#d1fae5;">Eres la ganadora de nuestro concurso</p>
      </td></tr>

      <!-- Premio -->
      <tr><td align="center" style="padding:34px 28px 8px;">
        <p style="margin:0;font-size:14px;color:#6b7280;">Tu premio</p>
        <p style="margin:6px 0 0;font-size:56px;line-height:1;font-weight:900;color:#059669;letter-spacing:-1px;">${clp(d.monto)}</p>
        <p style="margin:10px 0 0;font-size:16px;line-height:1.5;color:#1f2937;">para llevarte tus productos favoritos <strong>gratis</strong>.</p>
      </td></tr>

      <!-- Cupón -->
      <tr><td style="padding:22px 28px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:2px dashed #10b981;border-radius:16px;">
          <tr><td align="center" style="padding:22px 16px;">
            <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#065f46;font-weight:700;">Tu código de cupón</p>
            <p style="margin:10px 0 0;font-size:28px;font-weight:900;color:#047857;letter-spacing:2px;font-family:'Courier New',Courier,monospace;">${codigo}</p>
            ${d.vigencia ? `<p style="margin:10px 0 0;font-size:12px;color:#065f46;">Válido hasta el ${esc(d.vigencia)}</p>` : ""}
          </td></tr>
        </table>
      </td></tr>

      <!-- Botón -->
      <tr><td align="center" style="padding:20px 28px 6px;">
        <a href="${esc(url)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 36px;border-radius:12px;">Canjear mi premio</a>
      </td></tr>

      <!-- Cómo funciona -->
      <tr><td style="padding:30px 28px 6px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:#1f2937;">¿Cómo lo uso?</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${paso(1, "Crea tu cuenta", `Regístrate en <a href="${esc(url)}" style="color:#059669;font-weight:600;">olivomarket.cl</a> con este mismo correo.`)}
          ${paso(2, "Arma tu carrito", `Elige lo que quieras hasta completar ${clp(d.monto)}. Los productos se cuentan a su <strong>precio completo</strong>, sin ofertas.`)}
          ${paso(3, "Ingresa tu código", "En el checkout escribe el código y tu carrito queda en <strong>$0</strong>.")}
        </table>
      </td></tr>

      <!-- Envío -->
      <tr><td style="padding:6px 28px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#1f2937;">🚚 Lo único que pagas es el envío</p>
            <p style="margin:6px 0 0;font-size:14px;line-height:1.55;color:#4b5563;">
              Si prefieres <strong>retirar en tienda, es completamente gratis</strong>: tu pedido sale en $0.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Letra chica -->
      <tr><td style="padding:14px 28px 30px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
          Cupón personal e intransferible, de un solo uso. Cubre hasta ${clp(d.monto)} en productos a precio completo;
          si tu carrito supera ese monto, pagas la diferencia. No se combina con otros descuentos ni ofertas.
        </p>
      </td></tr>

      <!-- Pie -->
      <tr><td align="center" style="background:#f9fafb;padding:22px 28px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;color:#6b7280;">Gracias por ser parte de OlivoMarket 🌿</p>
        <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} OlivoMarket</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
