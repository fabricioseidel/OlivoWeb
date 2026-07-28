/**
 * Renderiza JSON-LD en el HTML servido (server component, sin "use client").
 * Los crawlers leen el HTML inicial: inyectar structured data desde el cliente
 * equivale a no tenerlo.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // El contenido proviene de generadores propios (lib/seo/schema.ts), no de
      // entrada de usuario. Se escapa `<` para evitar cerrar el <script> antes.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
