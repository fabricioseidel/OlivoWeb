"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function CambiarContrasenaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contrasenaActual: "",
    nuevaContrasena: "",
    confirmarContrasena: ""
  });
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [errors, setErrors] = useState({
    contrasenaActual: "",
    nuevaContrasena: "",
    confirmarContrasena: ""
  });

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/cambiar-contrasena");
    } else if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores al escribir
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      contrasenaActual: "",
      nuevaContrasena: "",
      confirmarContrasena: ""
    };
    
    if (!formData.contrasenaActual) {
      newErrors.contrasenaActual = "La contraseña actual es requerida";
      isValid = false;
    }
    
    if (!formData.nuevaContrasena) {
      newErrors.nuevaContrasena = "La nueva contraseña es requerida";
      isValid = false;
    } else if (formData.nuevaContrasena.length < 8) {
      newErrors.nuevaContrasena = "La contraseña debe tener al menos 8 caracteres";
      isValid = false;
    }
    
    if (!formData.confirmarContrasena) {
      newErrors.confirmarContrasena = "Debe confirmar la nueva contraseña";
      isValid = false;
    } else if (formData.nuevaContrasena !== formData.confirmarContrasena) {
      newErrors.confirmarContrasena = "Las contraseñas no coinciden";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulación de actualización (en una app real, enviaríamos a la API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulamos una validación exitosa
      setMensaje({
        tipo: "exito",
        texto: "Contraseña actualizada correctamente"
      });
      
      // Limpiar formulario
      setFormData({
        contrasenaActual: "",
        nuevaContrasena: "",
        confirmarContrasena: ""
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Ha ocurrido un error al actualizar la contraseña"
      });
    } finally {
      setIsSubmitting(false);
      
      // Auto-limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setMensaje({ tipo: "", texto: "" });
      }, 5000);
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

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Cambiar Contraseña</h1>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-md ${mensaje.tipo === "exito" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 max-w-md mx-auto">
            <div>
              <label htmlFor="contrasenaActual" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña actual
              </label>
              <input
                type="password"
                id="contrasenaActual"
                name="contrasenaActual"
                value={formData.contrasenaActual}
                onChange={handleChange}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.contrasenaActual ? 'border-red-300' : ''}`}
              />
              {errors.contrasenaActual && (
                <p className="mt-1 text-sm text-red-600">{errors.contrasenaActual}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="nuevaContrasena" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                id="nuevaContrasena"
                name="nuevaContrasena"
                value={formData.nuevaContrasena}
                onChange={handleChange}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.nuevaContrasena ? 'border-red-300' : ''}`}
              />
              {errors.nuevaContrasena ? (
                <p className="mt-1 text-sm text-red-600">{errors.nuevaContrasena}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  La contraseña debe tener al menos 8 caracteres
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmarContrasena" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                id="confirmarContrasena"
                name="confirmarContrasena"
                value={formData.confirmarContrasena}
                onChange={handleChange}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.confirmarContrasena ? 'border-red-300' : ''}`}
              />
              {errors.confirmarContrasena && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmarContrasena}</p>
              )}
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
                    Actualizando...
                  </>
                ) : (
                  'Cambiar contraseña'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
