import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { BUSINESS } from "@/lib/seo/business";
import {
  peorEstado,
  resumirLista,
  type Check,
  type CheckGroup,
} from "@/lib/admin/checks";

export const dynamic = "force-dynamic";

/**
 * Estado de apertura de la tienda.
 *
 * Comprueba de verdad lo que hasta ahora había que ir a mirar a mano en cinco
 * sitios distintos: la base, las variables de Vercel, el catálogo y el
 * inventario. `TODO-HUMANO.md` describe qué falta; esto responde **cuáles de
 * esos puntos ya están resueltos ahora mismo**, que es una pregunta distinta y
 * que cambia cada día.
 *
 * Regla dura: NINGÚN valor secreto sale en la respuesta. De un token se informa
 * si existe y de qué tipo es por su prefijo, nunca su contenido.
 */

/** Presencia de una variable de entorno, sin revelar su valor. */
function checkVariable(
  id: string,
  label: string,
  valor: string | undefined,
  consecuencia: string,
  hint: string
): Check {
  return valor
    ? { id, label, status: "ok", detail: "Configurada." }
    : { id, label, status: "error", detail: consecuencia, hint };
}

async function grupoBaseDeDatos(): Promise<CheckGroup> {
  const checks: Check[] = [];

  // La consulta falla si la columna no existe: es exactamente la señal de que
  // la migración del modo vitrina todavía no se aplicó.
  const { data, error } = await supabaseServer
    .from("settings")
    .select("preview_mode, preview_message")
    .eq("id", true)
    .maybeSingle();

  const columnaFalta =
    error && /preview_mode|column .* does not exist/i.test(error.message ?? "");

  if (columnaFalta) {
    checks.push({
      id: "migracion",
      label: "Migraciones aplicadas",
      status: "error",
      detail: "La columna `preview_mode` no existe en la base.",
      hint:
        "Ejecuta `supabase db push`. Hasta entonces la tienda queda en vitrina " +
        "aunque desactives el interruptor, porque el código cierra ante la duda.",
    });
  } else if (error) {
    checks.push({
      id: "migracion",
      label: "Migraciones aplicadas",
      status: "warn",
      detail: `No se pudo leer la configuración: ${error.message}`,
    });
  } else {
    checks.push({
      id: "migracion",
      label: "Migraciones aplicadas",
      status: "ok",
      detail: "La columna `preview_mode` existe.",
    });

    const enVitrina = data?.preview_mode !== false;
    checks.push({
      id: "vitrina",
      label: "Modo vitrina",
      status: enVitrina ? "warn" : "ok",
      detail: enVitrina
        ? "Activo: se puede mirar la tienda, no comprar."
        : "Desactivado: la tienda acepta pedidos.",
      hint: enVitrina
        ? "Desactívalo en Configuración → Políticas el día que abras, no antes."
        : "Los pedidos se cobran de verdad. Revisa el resto de esta lista.",
    });
  }

  return {
    titulo: "Base de datos",
    descripcion: "Sin las migraciones aplicadas, la tienda no se puede abrir.",
    checks,
  };
}

function grupoCobros(): CheckGroup {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  const checks: Check[] = [];

  if (!token) {
    checks.push({
      id: "mp-token",
      label: "Token de MercadoPago",
      status: "error",
      detail: "MERCADOPAGO_ACCESS_TOKEN no está definido. No se puede cobrar.",
      hint: "Cárgalo en Vercel → Settings → Environment Variables y vuelve a desplegar.",
    });
  } else {
    const produccion = token.startsWith("APP_USR-");
    checks.push({
      id: "mp-token",
      label: "Token de MercadoPago",
      status: produccion ? "ok" : "warn",
      detail: produccion
        ? "De producción: los cobros son reales."
        : "De prueba: los pedidos que entren no te van a pagar nada.",
      hint: produccion
        ? undefined
        : "Cambia a las credenciales de producción antes de abrir.",
    });
  }

  checks.push(
    checkVariable(
      "mp-webhook",
      "Secret del webhook de MercadoPago",
      process.env.MERCADOPAGO_WEBHOOK_SECRET,
      "Sin él, en producción se rechazan TODAS las notificaciones: los pedidos pagados nunca se marcan como pagados.",
      "Cárgalo en Vercel y registra la URL del webhook CON `www`: el dominio raíz responde 307 y los webhooks no siguen redirecciones."
    ),
    checkVariable(
      "site-url",
      "URL pública del sitio",
      process.env.NEXT_PUBLIC_SITE_URL,
      "NEXT_PUBLIC_SITE_URL no está definida: MercadoPago devolvería al cliente a un dominio equivocado tras pagar.",
      "Debe ser la URL pública con https."
    )
  );

  return {
    titulo: "Cobros",
    descripcion:
      "El diagnóstico completo, que consulta la API de MercadoPago, está en Configuración → Métodos de Pago.",
    checks,
  };
}

function grupoCorreoYTareas(): CheckGroup {
  return {
    titulo: "Correo y tareas programadas",
    checks: [
      checkVariable(
        "resend",
        "Envío de correos",
        process.env.RESEND_API_KEY,
        "RESEND_API_KEY no está definida: no sale ningún correo, ni confirmación de pedido ni recuperación de contraseña.",
        "Cárgala en Vercel y verifica el dominio del remitente en Resend, o los correos caen en spam."
      ),
      checkVariable(
        "cron",
        "Cierre automático de turnos",
        process.env.CRON_SECRET,
        "CRON_SECRET no está definida: los turnos de caja no se cierran solos.",
        "Cárgala en Vercel; el cron ya está declarado en vercel.json."
      ),
    ],
  };
}

/**
 * Productos que no se ven en la tienda.
 *
 * Un producto aparece solo si tiene nombre, categoría, precio mayor a 0 y foto
 * propia. La foto es la que más suele faltar, y desde el panel no se nota:
 * el producto existe, se edita, pero ningún cliente lo ve.
 */
async function grupoCatalogo(): Promise<CheckGroup> {
  const { data, error } = await supabaseServer
    .from("products")
    .select("barcode, name, category, sale_price, image_url, is_active");

  if (error) {
    return {
      titulo: "Catálogo",
      checks: [
        {
          id: "catalogo",
          label: "Productos visibles",
          status: "warn",
          detail: `No se pudo leer el catálogo: ${error.message}`,
        },
      ],
    };
  }

  const activos = (data ?? []).filter((p) => p.is_active !== false);
  const faltantes = { nombre: [] as string[], categoria: [] as string[], precio: [] as string[], foto: [] as string[] };

  for (const p of activos) {
    const id = String(p.name || p.barcode);
    if (!String(p.name ?? "").trim()) faltantes.nombre.push(String(p.barcode));
    else if (!String(p.category ?? "").trim()) faltantes.categoria.push(id);
    else if (!(Number(p.sale_price) > 0)) faltantes.precio.push(id);
    else if (!String(p.image_url ?? "").trim()) faltantes.foto.push(id);
  }

  const invisibles =
    faltantes.nombre.length + faltantes.categoria.length + faltantes.precio.length + faltantes.foto.length;

  const checks: Check[] = [
    {
      id: "visibles",
      label: "Productos visibles en la tienda",
      status: invisibles === 0 ? "ok" : "warn",
      detail:
        invisibles === 0
          ? `Los ${activos.length} productos activos se ven en la tienda.`
          : `${invisibles} de ${activos.length} productos activos NO aparecen en la tienda.`,
      hint:
        invisibles === 0
          ? undefined
          : "Complétalos desde Productos → Edición masiva. Un producto sin foto existe en el panel pero ningún cliente lo ve.",
    },
  ];

  const motivos: Array<[string, string, string[]]> = [
    ["sin-foto", "Sin foto", faltantes.foto],
    ["sin-precio", "Sin precio", faltantes.precio],
    ["sin-categoria", "Sin categoría", faltantes.categoria],
    ["sin-nombre", "Sin nombre", faltantes.nombre],
  ];

  for (const [id, label, lista] of motivos) {
    if (lista.length > 0) {
      checks.push({
        id,
        label: `${label} (${lista.length})`,
        status: "warn",
        detail: resumirLista(lista),
      });
    }
  }

  return { titulo: "Catálogo", checks };
}

/**
 * Coherencia del inventario.
 *
 * `branch_stock` es la fuente de verdad y `products.stock` es su suma. Los
 * caminos antiguos escribían esa columna a mano y la dejaban desalineada; ya
 * están unificados, pero los números que dejaron siguen en la base. Esto los
 * saca a la luz sin tener que consultar la base a mano.
 */
async function grupoInventario(): Promise<CheckGroup> {
  const [productos, sucursal] = await Promise.all([
    supabaseServer.from("products").select("barcode, name, stock").eq("is_active", true),
    supabaseServer.from("branch_stock").select("product_barcode, stock"),
  ]);

  if (productos.error || sucursal.error) {
    return {
      titulo: "Inventario",
      checks: [
        {
          id: "inventario",
          label: "Coherencia del stock",
          status: "warn",
          detail: `No se pudo comparar: ${productos.error?.message || sucursal.error?.message}`,
        },
      ],
    };
  }

  const porSucursal = new Map<string, number>();
  for (const fila of sucursal.data ?? []) {
    const codigo = String(fila.product_barcode);
    porSucursal.set(codigo, (porSucursal.get(codigo) ?? 0) + Number(fila.stock ?? 0));
  }

  const desalineados: string[] = [];
  const sinFila: string[] = [];

  for (const p of productos.data ?? []) {
    const codigo = String(p.barcode);
    const nombre = String(p.name || codigo);
    const global = Number(p.stock ?? 0);

    if (!porSucursal.has(codigo)) {
      // Sin fila en branch_stock no se puede vender: la venta web descuenta de
      // ahí y rechaza el pedido por "stock insuficiente".
      if (global > 0) sinFila.push(`${nombre} (dice ${global})`);
      continue;
    }
    const suma = porSucursal.get(codigo)!;
    if (Math.round(suma) !== Math.round(global)) {
      desalineados.push(`${nombre} (${global} vs ${suma})`);
    }
  }

  const checks: Check[] = [
    {
      id: "stock-coherente",
      label: "Stock del catálogo contra el de sucursal",
      status: desalineados.length === 0 ? "ok" : "warn",
      detail:
        desalineados.length === 0
          ? "Todos los productos cuadran."
          : `${desalineados.length} productos con cifras distintas: ${resumirLista(desalineados)}`,
      hint:
        desalineados.length === 0
          ? undefined
          : "Corrígelos escribiendo la cantidad real en Productos → Edición masiva: el ajuste ahora se aplica sobre el stock de sucursal y queda registrado en inventory_movements.",
    },
  ];

  if (sinFila.length > 0) {
    checks.push({
      id: "sin-sucursal",
      label: `Sin stock de sucursal (${sinFila.length})`,
      status: "error",
      detail: resumirLista(sinFila),
      hint:
        "Estos productos figuran con stock pero no tienen fila en la sucursal, así que una venta web se rechaza por falta de stock. Regístralos con una recepción o escribiendo la cantidad en Edición masiva.",
    });
  }

  return { titulo: "Inventario", checks };
}

async function grupoLegales(): Promise<CheckGroup> {
  const checks: Check[] = [
    {
      id: "documentos",
      label: "Documentos publicados",
      status: "ok",
      detail: "Términos, privacidad y cambios/devoluciones están publicados y enlazados en el pie.",
    },
    {
      id: "rut",
      label: "RUT del proveedor",
      status: BUSINESS.rut ? "ok" : "warn",
      detail: BUSINESS.rut
        ? `Declarado: ${BUSINESS.rut}.`
        : "No está cargado, así que los documentos no identifican al proveedor.",
      hint: BUSINESS.rut
        ? undefined
        : "Cárgalo en `BUSINESS.rut` (src/lib/seo/business.ts). Mientras falte, la línea simplemente no se muestra.",
    },
  ];

  return { titulo: "Documentos legales", checks };
}

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const grupos = await Promise.all([
      grupoBaseDeDatos(),
      grupoCobros(),
      grupoCorreoYTareas(),
      grupoCatalogo(),
      grupoInventario(),
      grupoLegales(),
    ]);

    const todos = grupos.flatMap((g) => g.checks);

    return NextResponse.json({
      generadoEn: new Date().toISOString(),
      estado: peorEstado(todos),
      bloqueantes: todos.filter((c) => c.status === "error").length,
      advertencias: todos.filter((c) => c.status === "warn").length,
      grupos,
    });
  } catch (error) {
    console.error("[estado-apertura]", error);
    return NextResponse.json(
      { error: "No se pudo calcular el estado de apertura" },
      { status: 500 }
    );
  }
}
