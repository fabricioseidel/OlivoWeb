import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ofertas | Olivo Market",
  description: "Aprovecha las ofertas y promociones de Olivo Market.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
