"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircleIcon, DocumentArrowDownIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

export default function OrderConfirmationPage() {
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  useEffect(() => {
    if (orderId) {
        // Ensure cart is cleared
        clearCart();
        
        // Fetch order details
        fetch(`/api/orders/${orderId}`)
            .then(res => {
                if(res.ok) return res.json();
                return null;
            })
            .then(data => {
                if (data) setOrder(data);
                else setOrder({ id: orderId, created_at: new Date().toISOString(), total: 0, status: 'Procesando' });
            })
            .catch(err => {
                console.error(err);
                setOrder({ id: orderId, created_at: new Date().toISOString(), total: 0, status: 'Procesando' });
            });
    }
  }, [orderId, clearCart]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // TODO: Implement actual PDF generation endpoint
      // For now, we'll simulate a download or use window.print() as a fallback
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Fallback to print for now until backend PDF generation is ready
      window.print();
      
      showToast("Comprobante listo para descargar", "success");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showToast("Error al generar el comprobante", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!orderId) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <p className="text-lg text-gray-600 mb-4">No se ha especificado un pedido.</p>
            <Link href="/"><Button>Volver al inicio</Button></Link>
        </div>
      );
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-green-50 p-8 text-center border-b border-green-100">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Gracias por tu compra!</h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Tu pedido ha sido confirmado exitosamente.
          </p>
        </div>
        
        <div className="p-8">
          <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-100">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-blue-600 font-medium uppercase tracking-wide mb-1">Número de pedido</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm text-gray-500 mb-1">Fecha</p>
                 <p className="font-medium text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-600 mb-2">
              Hemos enviado un correo electrónico de confirmación a tu dirección registrada.
            </p>
            <p className="text-sm text-gray-500">
              Revisa tu bandeja de entrada (y la carpeta de spam por si acaso) para ver los detalles completos.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-gray-100">
            <Button 
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex items-center justify-center gap-2"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DocumentArrowDownIcon className="h-5 w-5" />
              )}
              {isDownloading ? "Generando..." : "Descargar Comprobante"}
            </Button>
            
            <Link href="/productos" className="w-full sm:w-auto">
              <Button className="w-full flex items-center justify-center gap-2">
                <ShoppingBagIcon className="h-5 w-5" />
                Seguir Comprando
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/mi-cuenta/pedidos" className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
              Ver estado de mi pedido en Mi Cuenta &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
