# ⚠️ ACCIÓN REQUERIDA: Habilitar "Places API" (Clásica)

El error que estás viendo (`LegacyApiNotActivatedMapError`) confirma que tu proyecto tiene habilitada la **"Places API (New)"** pero **NO** la **"Places API"** (la versión clásica/legacy).

El componente de autocompletado de Google Maps para JavaScript (`google.maps.places.Autocomplete`) todavía utiliza la API clásica por debajo.

## Solución:

1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/google/maps-apis/api-list).
2. En el menú de "APIs & Services" > "Library" (Biblioteca).
3. Busca **exactamente** el término: `Places API`.
   - Verás varios resultados.
   - Busca el que se llama **"Places API"** (a secas) o **"Places API (Legacy)"**.
   - **NO** confundir con "Places API (New)".
4. Haz clic en ella y pulsa el botón **ENABLE** (Habilitar).

Una vez habilitada, espera 1-2 minutos y vuelve a probar tu página. El error debería desaparecer y el autocompletado funcionará.
