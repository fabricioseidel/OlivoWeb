import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categorías | Olivo Market",
  description: "Navega por las categorías de productos de Olivo Market.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
