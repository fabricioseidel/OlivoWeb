/**
 * Utility to calculate shipping distance and cost using Google Maps Distance Matrix
 */

export interface DistanceResult {
    distanceKm: number;
    durationText: string;
    success: boolean;
    error?: string;
}

export async function calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
): Promise<DistanceResult> {

    return new Promise(async (resolve) => {
        try {
            // Use the new Google Maps Routes REST API directly since the JS SDK method is legacy
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                resolve({ distanceKm: 0, durationText: "", success: false, error: "API Key missing" });
                return;
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
                resolve({ distanceKm: 0, durationText: "", success: false, error: errData.error?.message || "Routes API error" });
                return;
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                resolve({ distanceKm: 0, durationText: "", success: false, error: "No route found" });
                return;
            }

            const route = data.routes[0];
            const distanceKm = route.distanceMeters / 1000;

            // Convert duration string "1234s" to a readable format
            const durationSeconds = parseInt(route.duration.replace('s', ''), 10);
            const minutes = Math.ceil(durationSeconds / 60);
            let durationText = `${minutes} min`;
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const remainingMins = minutes % 60;
                durationText = remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
            }

            resolve({
                distanceKm,
                durationText,
                success: true
            });
        } catch (e: any) {
            resolve({ distanceKm: 0, durationText: "", success: false, error: e.message });
        }
    });
}

export function calculateShippingCost(
    distanceKm: number,
    baseFee: number,
    pricePerKm: number
): number {
    return baseFee + (distanceKm * pricePerKm);
}
