# Resultados del Test de Google Maps

He realizado pruebas de conexión con tu API Key (`AIzaSy...E6Hs`) y estos son los resultados:

## 1. Geocoding API (Necesaria para "Usar mi ubicación")
**Estado:** ❌ DENEGADO
**Error:** `REQUEST_DENIED` - "This API project is not authorized to use this API."
**Solución:** Debes habilitar la **Geocoding API** en tu consola de Google Cloud.

## 2. Places API (Necesaria para el buscador de direcciones)
**Estado:** ❌ DENEGADO
**Error:** `REQUEST_DENIED` - "You’re calling a legacy API, which is not enabled for your project."
**Solución:** Debes habilitar la **Places API (New)** y la **Places API** (Legacy) en tu consola de Google Cloud.

## 3. Maps JavaScript API (Necesaria para cargar el mapa)
**Estado:** Probablemente deshabilitada o restringida.
**Síntoma:** El objeto `google.maps` no se carga en el navegador, por eso ves el mensaje "Google Maps no está listo".
**Solución:** Habilita la **Maps JavaScript API**.

---

## Pasos para solucionar:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona tu proyecto.
3. Ve a "APIs & Services" > "Library".
4. Busca y habilita estas 3 APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
5. Espera unos 5 minutos a que los cambios surtan efecto.
