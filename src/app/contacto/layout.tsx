import type { Metadata } from "next";
import { BUSINESS } from "@/lib/seo/business";

export const metadata: Metadata = {
  title: "Contacto | Olivo Market Ñuñoa",
  description:
    "Contacta a Olivo Market en Av. José Pedro Alessandri 2010, Local A, Ñuñoa. Teléfono, WhatsApp, correo, horarios de atención y mapa para llegar al local. Atendemos de lunes a domingo.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/contacto",
    title: "Contacto | Olivo Market Ñuñoa",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
