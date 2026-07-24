import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { mapSettingsRow, FALLBACK_SETTINGS } from "@/lib/settings-shared";

// GET /api/settings — Configuración pública de la tienda.
// La usan la portada, Navbar, Footer, checkout y contacto (visitantes anónimos
// incluidos): /api/admin/settings quedó detrás del middleware de autenticación,
// así que las páginas públicas leen desde aquí.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", true)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = data ? mapSettingsRow(data) : FALLBACK_SETTINGS;

    // Excluir configuración operativa de emails (no la necesita la tienda pública)
    const publicSettings = { ...settings };
    delete publicSettings.orderConfirmationEnabled;
    delete publicSettings.shippingConfirmationEnabled;
    delete publicSettings.orderCancellationEnabled;
    delete publicSettings.customerSignupWelcomeEnabled;
    delete publicSettings.marketingEmailsEnabled;

    return NextResponse.json(publicSettings, {
      headers: {
        // Cache corto en CDN: la tienda tolera 60s de desfase tras un cambio
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[SETTINGS][PUBLIC][GET]", error);
    return NextResponse.json({ error: "Error fetching settings" }, { status: 500 });
  }
}
