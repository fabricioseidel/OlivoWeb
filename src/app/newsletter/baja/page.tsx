import type { Metadata } from "next";
import { Suspense } from "react";
import BajaClient from "./BajaClient";

export const metadata: Metadata = {
  title: "Darse de baja del newsletter | Olivo Market",
  robots: { index: false, follow: false },
};

export default function NewsletterBajaPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-24 text-center text-gray-600">Cargando...</div>}>
      <BajaClient />
    </Suspense>
  );
}
