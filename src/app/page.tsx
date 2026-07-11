import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  // title/description/OG se heredan del layout raíz (ya dicen "Olivo Market"
  // y la descripción de marca) — acá solo fijamos el canonical de "/", para
  // que no quede sin definir en la página que más importa que lo tenga.
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomeClient />;
}
