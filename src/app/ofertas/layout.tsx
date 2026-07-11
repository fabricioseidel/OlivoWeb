import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ofertas | Olivo Market",
  description: "Aprovecha las ofertas y promociones de Olivo Market.",
  alternates: { canonical: "/ofertas" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
