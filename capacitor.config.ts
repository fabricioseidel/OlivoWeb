import type { CapacitorConfig } from "@capacitor/cli";

// App nativa "cascarón" que envuelve /operaciones: una pantalla dedicada con
// Venta, Recepción, Inventario, Caja y Cierre, sin el panel admin alrededor ni
// el catálogo de la tienda. No hay build web local: el contenido se sirve en
// vivo desde `server.url`, contra la misma base de datos.
const config: CapacitorConfig = {
  appId: "cl.olivomarket.operaciones",
  appName: "Olivo Operaciones",
  webDir: "www",
  server: {
    // URL de arranque: si no hay sesión, el middleware redirige a /login con
    // callbackUrl=/operaciones, y tras autenticarse con credenciales válidas
    // vuelve aquí.
    url: "https://www.olivomarket.cl/operaciones",
    androidScheme: "https",
    allowNavigation: ["olivomarket.cl", "*.olivomarket.cl"],
  },
};

export default config;
