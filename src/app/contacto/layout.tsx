import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto | Olivo Market",
  description: "Contáctanos — Olivo Market, productos venezolanos premium en Chile.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
