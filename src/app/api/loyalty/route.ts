import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getLoyaltyConfig,
  updateLoyaltyConfig,
  getCustomerLoyalty,
  getTransactionHistory,
  earnPoints,
  redeemPoints,
  addBonusPoints,
} from "@/server/loyalty.service";

// GET /api/loyalty — Get config or customer loyalty info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const action = searchParams.get("action");

    if (action === "config") {
      const config = await getLoyaltyConfig();
      return NextResponse.json(config);
    }

    if (email) {
      // El saldo y el historial de puntos son de cada cliente: sólo los ve
      // el dueño de la cuenta o el personal (panel de puntos, caja).
      const session: any = await getServerSession(authOptions as any);
      const rol = String(session?.role || session?.user?.role || "").toUpperCase();
      const propio = String(session?.user?.email ?? "").toLowerCase().trim() === email.toLowerCase().trim();
      if (!session?.user) {
        return NextResponse.json({ error: "Inicia sesión para ver tus puntos" }, { status: 401 });
      }
      if (!propio && rol !== "ADMIN" && rol !== "SELLER") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      const loyalty = await getCustomerLoyalty(email);
      const history = await getTransactionHistory(email);
      return NextResponse.json({ ...loyalty, history });
    }

    // Default: return config
    const config = await getLoyaltyConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/loyalty — Earn, redeem, or add bonus points
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "earn": {
        if (!["ADMIN", "SELLER"].includes(role)) {
          return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const result = await earnPoints({
          customerEmail: body.customerEmail,
          customerId: body.customerId,
          amount: body.amount,
          referenceType: body.referenceType || "sale",
          referenceId: body.referenceId || "",
        });
        return NextResponse.json({ ok: true, ...result });
      }

      case "redeem": {
        // Canjear gasta puntos: sólo el personal (en caja o en el panel).
        // El cliente canjea en el checkout, que usa el correo de su sesión.
        if (!["ADMIN", "SELLER"].includes(role)) {
          return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        if (!body.customerEmail || !body.points) {
          return NextResponse.json({ error: "Email y puntos requeridos" }, { status: 400 });
        }
        const result = await redeemPoints({
          customerEmail: body.customerEmail,
          points: body.points,
          description: body.description,
        });
        return NextResponse.json({ ok: true, ...result });
      }

      case "bonus": {
        if (role !== "ADMIN") {
          return NextResponse.json({ error: "Solo admin puede dar bonos" }, { status: 401 });
        }
        const newBalance = await addBonusPoints({
          customerEmail: body.customerEmail,
          points: body.points,
          description: body.description || "Bonus manual",
          referenceType: body.referenceType,
        });
        return NextResponse.json({ ok: true, newBalance });
      }

      default:
        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/loyalty — Update config (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    await updateLoyaltyConfig(body);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
