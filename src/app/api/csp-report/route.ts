import { NextResponse } from 'next/server';

/**
 * Recibe los reportes de la política de contenido (modo sólo reporte, ver
 * next.config.ts) y deja una línea por reporte en los logs de Vercel.
 *
 * Es público por diseño (lo llama el navegador de cualquier visitante), así
 * que no guarda nada en la base, corta el cuerpo y limita cuántos registra
 * por instancia para que nadie llene los logs.
 */

const MAX_BYTES = 8 * 1024;
const MAX_POR_MINUTO = 30;
let ventana = { inicio: 0, cuenta: 0 };

function texto(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export async function POST(req: Request) {
  const ahora = Date.now();
  if (ahora - ventana.inicio > 60_000) ventana = { inicio: ahora, cuenta: 0 };
  if (++ventana.cuenta > MAX_POR_MINUTO) return new NextResponse(null, { status: 204 });

  try {
    const crudo = (await req.text()).slice(0, MAX_BYTES);
    const json = JSON.parse(crudo);
    // Formato clásico (report-uri): { "csp-report": {...} }. El nuevo
    // (Reporting API) manda una lista de { body: {...} }.
    const reportes: Record<string, unknown>[] = Array.isArray(json)
      ? json.map((r) => (r?.body ?? {}) as Record<string, unknown>)
      : [(json?.['csp-report'] ?? {}) as Record<string, unknown>];

    for (const r of reportes.slice(0, 5)) {
      console.warn('[CSP]', JSON.stringify({
        directiva: texto(r['effective-directive'] ?? r['violated-directive'] ?? r.effectiveDirective),
        bloqueado: texto(r['blocked-uri'] ?? r.blockedURL),
        pagina: texto(r['document-uri'] ?? r.documentURL),
      }));
    }
  } catch {
    // Reporte mal formado: se ignora.
  }
  return new NextResponse(null, { status: 204 });
}
