import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdmin(session: any) {
  const role = session?.role || session?.user?.role;
  return typeof role === "string" && role.toUpperCase().includes("ADMIN");
}

async function ensureAdmin() {
  const session: any = await getServerSession(authOptions as any);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return session;
}

function sanitizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    return digits.replace(/\+/g, "").trim();
  }
  return digits.trim();
}

function buildMessageText({
  supplierName,
  items,
  notes,
  contactName,
}: {
  supplierName: string;
  items: Array<{
    name: string;
    quantity: number;
    sku?: string | null;
  }>;
  notes?: string | null;
  contactName?: string | null;
}) {
  const greetingName = contactName || supplierName || "equipo";
  const header = `Hola ${greetingName}, necesitamos reponer inventario:`;
  const lines = items.map((item) => {
    const sku = item.sku ? ` (SKU ${item.sku})` : "";
    return `• ${item.name}${sku}: ${item.quantity} unidades`;
  });
  const extra = notes ? `\nNotas: ${notes}` : "";
  const footer = "\nGracias, quedamos atentos a su confirmación.";
  return `${header}\n\n${lines.join("\n")}${extra}${footer}`;
}

export async function POST(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const supplierId = String(body?.supplierId ?? "").trim();
    const items = Array.isArray(body?.items) ? body.items : [] as unknown[];
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!supplierId) {
      return NextResponse.json(
        { error: "Proveedor obligatorio" },
        { status: 400 },
      );
    }
    if (!items.length) {
      return NextResponse.json(
        { error: "Debe incluir al menos un producto" },
        { status: 400 },
      );
    }

    const itemList = items
      .map((raw: { productId?: unknown; name?: unknown; quantity?: unknown; sku?: unknown }) => ({
        productId: String(raw.productId ?? "").trim(),
        name: String(raw.name ?? "").trim(),
        quantity: Number(raw.quantity ?? 0),
        sku: raw.sku ? String(raw.sku).trim() : null,
      }))
      .filter((item) => item.productId && item.name && item.quantity > 0);

    if (!itemList.length) {
      return NextResponse.json(
        { error: "Los productos no son válidos" },
        { status: 400 },
      );
    }

    const { data: supplier, error } = await supabaseAdmin
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .maybeSingle();

    if (error || !supplier) {
      console.error("[REPLENISHMENT][MESSAGE] Supplier error:", error);
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 },
      );
    }

    const targetPhone =
      sanitizePhone(supplier.whatsapp) ?? sanitizePhone(supplier.phone);
    if (!targetPhone) {
      return NextResponse.json(
        { error: "El proveedor no tiene número de WhatsApp/telefono" },
        { status: 400 },
      );
    }

    const message = buildMessageText({
      supplierName: supplier.name ?? "",
      items: itemList,
      notes,
      contactName: supplier.contact_name ?? supplier.name ?? "",
    });
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${targetPhone}?text=${encoded}`;

    return NextResponse.json({
      text: message,
      phone: targetPhone,
      url,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contact_name,
      },
    });
  } catch (error) {
    console.error("[REPLENISHMENT][MESSAGE] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo generar el mensaje" },
      { status: 500 },
    );
  }
}
