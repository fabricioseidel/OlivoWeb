import { NextRequest, NextResponse } from "next/server";
import { getShiftsHistory } from "@/server/reports.service";

/**
 * GET /api/admin/reports/shifts?from=ISO&to=ISO&branchId=uuid&limit=50
 * Historial de turnos con cuadre por método (closed_by_method).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to   = searchParams.get("to") ?? undefined;
    const branchId = searchParams.get("branchId");
    const limit = Number(searchParams.get("limit")) || 50;

    const history = await getShiftsHistory({ from, to, branchId, limit });
    return NextResponse.json({ shifts: history });
  } catch (error: any) {
    console.error("reports/shifts error:", error);
    return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
  }
}
