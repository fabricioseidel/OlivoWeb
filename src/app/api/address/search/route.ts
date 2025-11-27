import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache to reduce load on Nominatim
// Key: query string, Value: { timestamp: number, data: any }
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const country = searchParams.get("country") || "cl";

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const cacheKey = `${country}:${q.toLowerCase().trim()}`;
  const now = Date.now();

  // Check cache
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (now - entry.timestamp < CACHE_TTL) {
      return NextResponse.json(entry.data);
    } else {
      cache.delete(cacheKey);
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("q", q);
    url.searchParams.set("countrycodes", country);
    url.searchParams.set("accept-language", "es");

    // Nominatim requires a User-Agent identifying the application
    const headers = {
      "User-Agent": "TecnoOlivoWeb/1.0 (contact@tecno-olivo.cl)", // Replace with actual contact info if available
      "Accept": "application/json",
    };

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      throw new Error(`Nominatim API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Update cache
    cache.set(cacheKey, { timestamp: now, data });

    // Clean up old cache entries if too big (simple protection)
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching from Nominatim:", error);
    return NextResponse.json(
      { error: "Failed to fetch address suggestions" },
      { status: 500 }
    );
  }
}
