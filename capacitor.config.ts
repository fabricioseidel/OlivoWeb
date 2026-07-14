import type { CapacitorConfig } from "@capacitor/cli";

// App nativa "cascarón" que envuelve directamente /admin/operaciones
// (Venta, Recepción, Caja, Cierre) del sitio ya desplegado. No hay build
// web local: todo el contenido se sirve en vivo desde `server.url`.
const config: CapacitorConfig = {
  appId: "cl.olivomarket.operaciones",
  appName: "Olivo Operaciones",
  webDir: "www",
  server: {
    // URL de arranque: si no hay sesión, el middleware redirige a /login
    // con callbackUrl=/admin/operaciones, y tras autenticarse vuelve aquí.
    url: "https://olivomarket.cl/admin/operaciones",
    androidScheme: "https",
    allowNavigation: ["olivomarket.cl", "*.olivomarket.cl"],
  },
};

export default config;
