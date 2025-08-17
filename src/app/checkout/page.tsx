"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "next-auth/react";
// Métodos de pago disponibles
const paymentMethods = [
  { id: "credit_card", name: "Tarjeta de Crédito" },
  { id: "debit_card", name: "Tarjeta de Débito" },
  { id: "mercadopago", name: "MercadoPago" },
  { id: "transbank", name: "Transbank" },
  { id: "bank_transfer", name: "Transferencia Bancaria" },
];

// Métodos de envío disponibles
const shippingMethods = [
  { id: "standard", name: "Envío Estándar", price: 10.00, days: "3-5 días hábiles" },
  { id: "express", name: "Envío Express", price: 20.00, days: "1-2 días hábiles" },
  { id: "pickup", name: "Retirar en Tienda", price: 0, days: "Disponible el mismo día" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cartItems } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
    const [selectedShippingMethod, setSelectedShippingMethod] = useState("standard");
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("credit_card");
  // Totales dinámicos según carrito y selección
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = shippingMethods.find(method => method.id === selectedShippingMethod)?.price || 0;
  const total = subtotal + shippingCost;
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Chile",
  });
  // Autofill: nombre/email desde profile; teléfono siempre desde defaultAddress
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const profileRaw = localStorage.getItem('profile');
      if (profileRaw) {
        const { nombre, apellidos, email } = JSON.parse(profileRaw);
        setShippingInfo(prev => ({
          ...prev,
            fullName: `${nombre || ''} ${apellidos || ''}`.trim() || prev.fullName,
          email: email || prev.email,
        }));
      }
    } catch {}
    try {
      const addrRaw = localStorage.getItem('defaultAddress');
      if (addrRaw) {
        const addr = JSON.parse(addrRaw);
        const addrLine = `${addr.calle || ''} ${addr.numero || ''}${addr.interior ? ' Int.' + addr.interior : ''}`.trim();
        setShippingInfo(prev => ({
          ...prev,
          address: addrLine || prev.address,
          city: addr.ciudad || prev.city,
          state: addr.estado || prev.state,
          zipCode: addr.codigoPostal || prev.zipCode,
          phone: addr.telefono || prev.phone, // forzar teléfono de dirección predeterminada
        }));
      }
    } catch {}
  }, []);
  

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleShippingMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedShippingMethod(e.target.value);
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPaymentMethod(e.target.value);
  };

  const handleContinue = () => {
    if (step === 1) {
      // Validar información de envío
      const { fullName, email, phone, address, city, state, zipCode } = shippingInfo;
      if (!fullName || !email || !phone || !address || !city || !state || !zipCode) {
        alert("Por favor complete todos los campos requeridos.");
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      // Procesar pago (aquí iría la integración real)
      setLoading(true);
      
      // Simulación de procesamiento
      setTimeout(() => {
        setLoading(false);
        // Redirigir a confirmación
        router.push("/checkout/confirmacion");
      }, 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center text-blue-600 relative">
            <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 border-blue-600 bg-blue-50`}>
              1
            </div>
            <div className="ml-2 font-medium">Envío</div>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
          <div className={`flex items-center relative ${step >= 2 ? "text-blue-600" : "text-gray-500"}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 2 ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"}`}>
              2
            </div>
            <div className="ml-2 font-medium">Pago</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {step === 1 ? (
              /* Paso 1: Información de envío */
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Envío</h2>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="Nombre completo"
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={shippingInfo.fullName}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Correo electrónico"
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={shippingInfo.email}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Teléfono"
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={shippingInfo.phone}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Input
                      label="Dirección"
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={shippingInfo.address}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Ciudad"
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={shippingInfo.city}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Región/Provincia"
                      id="state"
                      name="state"
                      type="text"
                      required
                      value={shippingInfo.state}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Código Postal"
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      required
                      value={shippingInfo.zipCode}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="País"
                      id="country"
                      name="country"
                      type="text"
                      disabled
                      value={shippingInfo.country}
                      onChange={handleShippingInfoChange}
                    />
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Método de Envío</h3>
                  
                  <div className="space-y-4">
                    {shippingMethods.map((method) => (
                      <div key={method.id} className="flex items-start">
                        <input
                          id={method.id}
                          name="shippingMethod"
                          type="radio"
                          value={method.id}
                          checked={selectedShippingMethod === method.id}
                          onChange={handleShippingMethodChange}
                          className="h-4 w-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={method.id} className="ml-3">
                          <div className="text-gray-900 font-medium">{method.name}</div>
                          <div className="text-gray-500 text-sm">
                            {method.days} - ${method.price.toFixed(2)}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Paso 2: Información de pago */
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Pago</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Método de Pago</h3>
                    
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center">
                          <input
                            id={method.id}
                            name="paymentMethod"
                            type="radio"
                            value={method.id}
                            checked={selectedPaymentMethod === method.id}
                            onChange={handlePaymentMethodChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor={method.id} className="ml-3">
                            <span className="text-gray-900 font-medium">{method.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Campos específicos para tarjeta de crédito/débito */}
                  {(selectedPaymentMethod === "credit_card" || selectedPaymentMethod === "debit_card") && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Input
                          label="Número de tarjeta"
                          id="cardNumber"
                          name="cardNumber"
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          required
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <Input
                          label="Nombre en la tarjeta"
                          id="cardName"
                          name="cardName"
                          type="text"
                          required
                        />
                      </div>
                      
                      <div>
                        <Input
                          label="Fecha de expiración (MM/AA)"
                          id="cardExpiry"
                          name="cardExpiry"
                          type="text"
                          placeholder="MM/AA"
                          required
                        />
                      </div>
                      
                      <div>
                        <Input
                          label="Código de seguridad (CVV)"
                          id="cardCvv"
                          name="cardCvv"
                          type="text"
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Campos específicos para transferencia */}
                  {selectedPaymentMethod === "bank_transfer" && (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-sm text-gray-700">
                        Después de completar el pedido, recibirás un correo electrónico con los datos bancarios para realizar la transferencia.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Botones de acción */}
            <div className="bg-gray-50 p-6 flex justify-between">
              {step === 1 ? (
                <Link href="/carrito">
                  <Button variant="outline">
                    Volver al Carrito
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" onClick={() => setStep(1)}>
                  Volver
                </Button>
              )}
              
              <Button onClick={handleContinue} disabled={loading}>
                {loading ? "Procesando..." : step === 1 ? "Continuar al Pago" : "Completar Compra"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Resumen */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Resumen del Pedido</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <span className="text-gray-600">{item.name}</span>
                    <span className="text-gray-500 ml-1">x{item.quantity}</span>
                  </div>
                  <p className="text-gray-900 font-medium">$ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="flex justify-between">
                <p className="text-gray-600">Subtotal</p>
                <p className="text-gray-900 font-medium">$ {subtotal.toFixed(2)}</p>
              </div>
              
              <div className="flex justify-between">
                <p className="text-gray-600">Envío</p>
                <p className="text-gray-900 font-medium">$ {shippingCost.toFixed(2)}</p>
              </div>
              
              <div className="border-t border-gray-200 pt-4 flex justify-between">
                <p className="text-lg font-medium text-gray-900">Total</p>
                <p className="text-lg font-bold text-blue-600">$ {total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
