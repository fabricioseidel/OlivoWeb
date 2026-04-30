import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json();

    // Cálculo de distancia usando fórmula de Haversine (sin APIs externas de pago)
    const R = 6371; // km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    // Multiplicamos por 1.3 para aproximar la distancia real en calles vs línea recta
    const distanceKm = R * c * 1.3;
    
    return NextResponse.json({
      distanceKm,
      durationText: "Aprox.",
      success: true,
      fallback: true
    });

  } catch (error: any) {
    console.error("[SHIPPING_CALCULATE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
