import { NextRequest, NextResponse } from "next/server";
import { getSalesReport } from "@/server/reports.service";
import { requireApiAdminOrSeller } from "@/lib/api-auth";

/**
 * GET /api/admin/reports/sales?from=ISO&to=ISO&branchId=uuid
 * Devuelve agregados de ventas: totales, por método, por día, por sucursal,
 * top productos. Usa el RPC report_sales_range que ejecuta todo en una
 * sola query SQL.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    const branchId = searchParams.get("branchId");

    if (!from || !to) {
      return NextResponse.json({ error: "from y to son requeridos (ISO)" }, { status: 400 });
    }

    const report = await getSalesReport({ from, to, branchId });
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("reports/sales error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}
