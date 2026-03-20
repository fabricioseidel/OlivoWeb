import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, sendOrderConfirmation, sendPOSReceipt, sendWelcomeEmail } from "@/server/email.service";

/**
 * POST /api/email/send
 * 
 * Unified email sending endpoint.
 * Accepts a `type` field to determine which template to use.
 * 
 * Auth: Requires admin/seller session
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session: any = await getServerSession(authOptions as any);
    const role = session?.role || session?.user?.role || "";
    const isAuthorized = ["ADMIN", "SELLER"].includes(String(role).toUpperCase());

    if (!session || !isAuthorized) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    let result;

    switch (type) {
      case "order_confirmation":
        result = await sendOrderConfirmation({
          to: body.to,
          customerName: body.customerName || "Cliente",
          orderId: body.orderId,
          total: body.total,
          itemCount: body.itemCount || body.items?.length || 0,
          paymentMethod: body.paymentMethod || "N/A",
          items: body.items || [],
        });
        break;

      case "pos_receipt":
        result = await sendPOSReceipt({
          to: body.to,
          customerName: body.customerName,
          saleId: body.saleId,
          total: body.total,
          paymentMethod: body.paymentMethod || "Efectivo",
          cashReceived: body.cashReceived,
          changeGiven: body.changeGiven,
          items: body.items || [],
        });
        break;

      case "welcome":
        result = await sendWelcomeEmail({
          to: body.to,
          customerName: body.customerName || "Cliente",
          couponCode: body.couponCode,
          bonusPoints: body.bonusPoints,
        });
        break;

      case "custom":
        if (!body.to || !body.subject || !body.html) {
          return NextResponse.json(
            { error: "Faltan campos: to, subject, html" },
            { status: 400 }
          );
        }
        result = await sendEmail({
          to: body.to,
          toName: body.toName,
          subject: body.subject,
          html: body.html,
          templateSlug: body.templateSlug,
          metadata: body.metadata,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Tipo de email no soportado: ${type}` },
          { status: 400 }
        );
    }

    if (result.ok) {
      return NextResponse.json({ ok: true, id: result.id });
    } else {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[API /email/send] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
