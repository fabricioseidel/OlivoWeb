"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// Tipo para las direcciones
type Direccion = {
  id: string;
  nombre: string;
  calle: string;
  numero: string;
  interior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  predeterminada: boolean;
};

export default function DireccionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [direccionActual, setDireccionActual] = useState<Direccion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // Formulario vacío inicial
  const formularioVacio: Direccion = {
    id: "",
    nombre: "",
    calle: "",
    numero: "",
    interior: "",
    colonia: "",
    ciudad: "",
    estado: "",
    codigoPostal: "",
    telefono: "",
    predeterminada: false
  };

  const [formData, setFormData] = useState<Direccion>(formularioVacio);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/direcciones");
    } else if (status === "authenticated") {
      // Cargar direcciones del usuario desde localStorage
      const saved = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('addresses') || '[]')
        : [];
      // Si el usuario está recién registrado y no tiene direcciones, limpiar localStorage demo
      if (typeof window !== 'undefined' && saved.length && saved[0]?.id?.startsWith('addr-')) {
        localStorage.removeItem('addresses');
        setDirecciones([]);
      } else {
        setDirecciones(saved);
      }
      setIsLoading(false);
    } else {
      // Solo modo demo: mostrar direcciones de ejemplo
      setDirecciones([
        {
          id: "addr-001",
          nombre: "Casa",
          calle: "Av. Insurgentes Sur",
          numero: "1234",
          interior: "Apt 5B",
          colonia: "Roma Norte",
          ciudad: "Ciudad de México",
          estado: "Ciudad de México",
          codigoPostal: "06700",
          telefono: "555-123-4567",
          predeterminada: true
        },
        {
          id: "addr-002",
          nombre: "Oficina",
          calle: "Paseo de la Reforma",
          numero: "567",
          interior: "Piso 10",
          colonia: "Juárez",
          ciudad: "Ciudad de México",
          estado: "Ciudad de México",
          codigoPostal: "06600",
          telefono: "555-987-6543",
          predeterminada: false
        }
      ]);
      setIsLoading(false);
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleAgregar = () => {
    setDireccionActual(null);
    setFormData(formularioVacio);
    setMostrarFormulario(true);
  };

  const handleEditar = (direccion: Direccion) => {
    setDireccionActual(direccion);
    setFormData(direccion);
    setMostrarFormulario(true);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setDireccionActual(null);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta dirección?")) {
      return;
    }
    
    try {
      // Simulación de eliminación
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDirecciones(prev => prev.filter(dir => dir.id !== id));
      
      setMensaje({
        tipo: "exito",
        texto: "Dirección eliminada correctamente"
      });
      
      // Auto-limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setMensaje({ tipo: "", texto: "" });
      }, 5000);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Error al eliminar la dirección"
      });
    }
  };

  const handleEstablecerPredeterminada = async (id: string) => {
    try {
      // Simulación de actualización
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDirecciones(prev => {
        const updated = prev.map(dir => ({
          ...dir,
          predeterminada: dir.id === id
        }));
        // Guardar en localStorage la nueva dirección predeterminada
        const pred = updated.find(dir => dir.id === id);
        if (pred && typeof window !== 'undefined') {
          localStorage.setItem('defaultAddress', JSON.stringify(pred));
        }
        return updated;
      });
      setMensaje({
        tipo: "exito",
        texto: "Dirección predeterminada actualizada"
      });
      setTimeout(() => {
        setMensaje({ tipo: "", texto: "" });
      }, 5000);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Error al actualizar la dirección predeterminada"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulación de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (direccionActual) {
        // Actualizar dirección existente
        setDirecciones(prev => {
          // Si la nueva dirección es predeterminada, actualizar las demás
          if (formData.predeterminada) {
            prev = prev.map(dir => ({
              ...dir,
              predeterminada: false
            }));
          }
          
          return prev.map(dir => 
            dir.id === direccionActual.id ? formData : dir
          );
        });
        
        setMensaje({
          tipo: "exito",
          texto: "Dirección actualizada correctamente"
        });
      } else {
        // Agregar nueva dirección
        const nuevaDireccion = {
          ...formData,
          id: `dir-${Date.now()}`
        };
        
        setDirecciones(prev => {
          // Si la nueva dirección es predeterminada, actualizar las demás
          if (nuevaDireccion.predeterminada) {
            prev = prev.map(dir => ({
              ...dir,
              predeterminada: false
            }));
          }
          
          return [...prev, nuevaDireccion];
        });
        
        setMensaje({
          tipo: "exito",
          texto: "Dirección agregada correctamente"
        });
      }
      
      // Cerrar formulario
      setMostrarFormulario(false);
      setDireccionActual(null);

      // Guardar dirección predeterminada en localStorage
      if (formData.predeterminada && typeof window !== 'undefined') {
        localStorage.setItem('defaultAddress', JSON.stringify(formData));
      }

      // Guardar todas las direcciones en localStorage
      if (typeof window !== 'undefined') {
        const updatedAddresses = direccionActual 
          ? direcciones.map(dir => dir.id === direccionActual.id ? formData : dir)
          : [...direcciones, { ...formData, id: `dir-${Date.now()}` }];
        localStorage.setItem('addresses', JSON.stringify(updatedAddresses));
      }
      
      // Redirigir de vuelta a mi cuenta
      router.push("/mi-cuenta");
      
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: "Ha ocurrido un error al guardar la dirección"
      });
    } finally {
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mis Direcciones</h1>
        {!mostrarFormulario && (
          <button
            onClick={handleAgregar}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Agregar dirección
          </button>
        )}
      </div>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-md ${mensaje.tipo === "exito" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarFormulario ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {direccionActual ? "Editar dirección" : "Agregar dirección"}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la dirección
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Casa, Oficina, etc."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de contacto
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="calle" className="block text-sm font-medium text-gray-700 mb-1">
                  Calle
                </label>
                <input
                  type="text"
                  id="calle"
                  name="calle"
                  value={formData.calle}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                  Número exterior
                </label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="interior" className="block text-sm font-medium text-gray-700 mb-1">
                  Número interior (opcional)
                </label>
                <input
                  type="text"
                  id="interior"
                  name="interior"
                  value={formData.interior}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="colonia" className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  id="colonia"
                  name="colonia"
                  value={formData.colonia}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="codigoPostal" className="block text-sm font-medium text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  id="codigoPostal"
                  name="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  id="ciudad"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="predeterminada"
                    name="predeterminada"
                    checked={formData.predeterminada}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="predeterminada" className="ml-2 block text-sm text-gray-700">
                    Establecer como dirección predeterminada
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelar}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
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
                  'Guardar dirección'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {direcciones.length > 0 ? (
            <div className="space-y-6">
              {direcciones.map((direccion) => (
                <div key={direccion.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${direccion.predeterminada ? 'border-blue-500' : 'border-transparent'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{direccion.nombre}</h3>
                        {direccion.predeterminada && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        {direccion.calle} {direccion.numero}
                        {direccion.interior && `, Int. ${direccion.interior}`}
                      </p>
                      <p className="text-sm text-gray-700">
                        {direccion.colonia}, {direccion.codigoPostal}
                      </p>
                      <p className="text-sm text-gray-700">
                        {direccion.ciudad}, {direccion.estado}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Tel: {direccion.telefono}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditar(direccion)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEliminar(direccion.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {!direccion.predeterminada && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEstablecerPredeterminada(direccion.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Establecer como dirección predeterminada
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes direcciones guardadas</h3>
              <p className="text-gray-500 mb-4">Agrega una dirección para facilitar tus próximas compras</p>
              <button
                onClick={handleAgregar}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Agregar dirección
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
