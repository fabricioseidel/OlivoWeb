import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const origin = { lat: -33.486975, lng: -70.6060496 };
  const destination = { lat: -33.486975, lng: -70.6060496 };
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
    
    console.log(response.status);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

test();
