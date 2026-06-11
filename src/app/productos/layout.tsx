import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Productos | Olivo Market",
  description: "Explora el catálogo completo de productos venezolanos premium de Olivo Market en Chile.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
