"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "ok" | "error" | "missing";

export default function BajaClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      setStatus("missing");
      return;
    }

    fetch(`/api/newsletter?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      {status === "loading" && <p className="text-gray-600">Procesando tu solicitud...</p>}
      {status === "ok" && (
        <>
          <h1 className="text-2xl font-bold text-gray-900">Listo, te diste de baja</h1>
          <p className="mt-3 text-gray-600">
            Ya no recibirás correos de nuestro newsletter. Si fue un error, puedes volver a
            suscribirte cuando quieras desde la tienda.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-gray-900">No pudimos procesar la baja</h1>
          <p className="mt-3 text-gray-600">
            El enlace parece inválido o expiró. Escríbenos y te damos de baja manualmente.
          </p>
        </>
      )}
      {status === "missing" && (
        <>
          <h1 className="text-2xl font-bold text-gray-900">Enlace incompleto</h1>
          <p className="mt-3 text-gray-600">
            Este enlace de baja no incluye la información necesaria. Usa el enlace del correo
            original.
          </p>
        </>
      )}
    </div>
  );
}
