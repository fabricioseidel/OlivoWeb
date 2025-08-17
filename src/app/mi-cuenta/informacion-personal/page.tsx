"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function InformacionPersonalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
  });
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/informacion-personal");
    } else if (status === "authenticated") {
      // Cargar datos guardados del localStorage primero, luego de la sesión
      if (typeof window !== 'undefined') {
  const savedProfile = JSON.parse(localStorage.getItem('profile') || '{}');
  // Si el perfil no tiene flag persisted, tratar nombres como vacíos (evita valores semilla anteriores)
  const isPersisted = !!savedProfile.persisted;
        
        const sessionEmail = session.user?.email || "";
        const profileEmail = savedProfile.email;
        // Si el email guardado no coincide con el de la sesión, usamos el de la sesión (evita correo de prueba)
        const effectiveEmail = sessionEmail || profileEmail || "";
        if (profileEmail && sessionEmail && profileEmail !== sessionEmail) {
          // Normalizar perfil para que coincida con la sesión
          const normalized = { ...savedProfile, email: sessionEmail };
          localStorage.setItem('profile', JSON.stringify(normalized));
        }
        setFormData({
          nombre: isPersisted ? (savedProfile.nombre || "") : "",
          apellidos: isPersisted ? (savedProfile.apellidos || "") : "",
          email: effectiveEmail,
        });
      } else {
        // Fallback si no hay localStorage: solo email, nombres vacíos para que el usuario ingrese sus datos reales
        setFormData({ nombre: "", apellidos: "", email: session.user?.email || "" });
      }
      setIsLoading(false);
    }
  }, [status, router, session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulación de actualización (en una app real, enviaríamos a la API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar datos en localStorage para autofill
      if (typeof window !== 'undefined') {
  const { nombre, apellidos } = formData;
  const realEmail = session?.user?.email || formData.email; // forzamos email real de la sesión
  localStorage.setItem('profile', JSON.stringify({ nombre, apellidos, email: realEmail, persisted: true }));
        // Eliminar teléfono antiguo si existía
        try {
          const saved = JSON.parse(localStorage.getItem('profile') || '{}');
          if (saved.telefono) {
            delete saved.telefono;
            localStorage.setItem('profile', JSON.stringify(saved));
          }
        } catch {}
      }
      
      // Redirigir de vuelta a mi cuenta después de actualizar
      router.push("/mi-cuenta");
      
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Ha ocurrido un error al actualizar la información"
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/mi-cuenta" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a Mi cuenta
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Información Personal</h1>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-md ${mensaje.tipo === "exito" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                disabled
              />
              <p className="mt-1 text-sm text-gray-500">
                El email no se puede cambiar
              </p>
            </div>
            {/* Campo teléfono eliminado: se usará el de la dirección predeterminada */}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
