import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { origin, destination } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng
            }
          }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: errData.error?.message || "Routes API error" }, { status: response.status });
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    const route = data.routes[0];
    const distanceKm = (route.distanceMeters || 0) / 1000;
    
    // Convert duration string "1234s" to a readable format
    const durationSeconds = parseInt(route.duration?.replace('s', '') || "0", 10);
    const minutes = Math.ceil(durationSeconds / 60);
    let durationText = `${minutes} min`;
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        durationText = remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
    }

    return NextResponse.json({
      distanceKm,
      durationText,
      success: true
    });
  } catch (error: any) {
    console.error("[SHIPPING_CALCULATE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
