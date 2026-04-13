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
    try {
        const response = await fetch('/api/shipping/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ origin, destination })
        });

        if (!response.ok) {
            const errData = await response.json();
            return { distanceKm: 0, durationText: "", success: false, error: errData.error || "Error calculating distance" };
        }

        const data = await response.json();
        return {
            distanceKm: data.distanceKm,
            durationText: data.durationText,
            success: true
        };
    } catch (e: any) {
        return { distanceKm: 0, durationText: "", success: false, error: e.message };
    }
}

export function calculateShippingCost(
    distanceKm: number,
    baseFee: number,
    pricePerKm: number
): number {
    return baseFee + (distanceKm * pricePerKm);
}
