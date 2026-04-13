import React, { useState, useEffect } from 'react';
import Input from "@/components/ui/Input";
import AddressAutocomplete, { AddressResult } from "@/components/AddressAutocomplete";

export interface ShippingInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  apartment?: string;
  tower?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  days: string;
}

interface ShippingFormProps {
  shippingInfo: ShippingInfo;
  onChange: (e: any) => void;
  onAddressSelect: (val: AddressResult | string) => void;
  shippingMethods: ShippingMethod[];
  selectedMethod: string;
  onMethodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCalculating?: boolean;
}

const getNextDays = (numDays: number) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

export default function ShippingForm({
  shippingInfo,
  onChange,
  onAddressSelect,
  shippingMethods,
  selectedMethod,
  onMethodChange,
  isCalculating
}: ShippingFormProps) {
  
  const [availableDays] = useState<Date[]>(() => getNextDays(7)); // Today + 6 = 7 days total
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ id: string; label: string; available: boolean; capacityRatio: string }[]>([]);

  // Format YYYY-MM-DD
  const formatDateForApi = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Format short display (Ej: Lun 13, Abr)
  const formatShortDate = (d: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    // Si es hoy
    const today = new Date();
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) {
       return `Hoy ${d.getDate()} ${months[d.getMonth()]}`;
    }
    // Si es mañana
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth()) {
       return `Mañana ${d.getDate()}`;
    }
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  useEffect(() => {
    // Si el usuario no ha seleccionado fecha aún, select "Hoy" por defecto
    if (selectedMethod === 'dynamic' && !shippingInfo.deliveryDate) {
       const todayStr = formatDateForApi(availableDays[0]);
       onChange({ target: { name: 'deliveryDate', value: todayStr } });
    }
  }, [selectedMethod, shippingInfo.deliveryDate, availableDays, onChange]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (selectedMethod !== 'dynamic' || !shippingInfo.deliveryDate) return;
      
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/shipping/slots?date=${shippingInfo.deliveryDate}`);
        if (res.ok) {
           const data = await res.json();
           setAvailableSlots(data.slots || []);
           
           // Si el slot actual ya no está disponible, lo quitamos
           if (shippingInfo.deliveryTimeSlot) {
              const currentSlot = data.slots.find((s: any) => s.id === shippingInfo.deliveryTimeSlot);
              if (!currentSlot || !currentSlot.available) {
                 onChange({ target: { name: 'deliveryTimeSlot', value: '' } });
              }
           }
        }
      } catch (err) {
        console.error("Fetch slots error:", err);
      } finally {
        setSlotsLoading(false);
      }
    };
    
    fetchSlots();
  }, [shippingInfo.deliveryDate, selectedMethod]);

  const handleDateClick = (d: Date) => {
    const dateStr = formatDateForApi(d);
    onChange({ target: { name: 'deliveryDate', value: dateStr } });
    onChange({ target: { name: 'deliveryTimeSlot', value: '' } }); // Reset slot on date change
  };

  const handleSlotClick = (slotId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    onChange({ target: { name: 'deliveryTimeSlot', value: slotId } });
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-black text-gray-900 mb-6">Información de Envío</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nombre completo"
            id="fullName"
            name="fullName"
            type="text"
            required
            value={shippingInfo.fullName}
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Dirección</label>
          <AddressAutocomplete
            id="address"
            name="address"
            value={shippingInfo.address}
            onChange={onAddressSelect}
            placeholder="Calle, número, comuna..."
            country="cl"
            required
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Depto / Oficina (Opcional)"
            id="apartment"
            name="apartment"
            type="text"
            value={shippingInfo.apartment || ''}
            placeholder="Ej: 402, B-3"
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Torre / Bloque (Opcional)"
            id="tower"
            name="tower"
            type="text"
            value={shippingInfo.tower || ''}
            placeholder="Ej: Torre A"
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Método de Envío</h3>
          {isCalculating && (
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse">
              <div className="animate-spin h-3.3 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full mr-2" />
              Calculando distancia...
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(!shippingMethods.find(m => m.id === 'dynamic')) && (
            <div className="flex items-center justify-between p-5 border-2 border-dashed border-gray-100 rounded-[1.5rem] bg-gray-50/50 opacity-80">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mr-4 border border-gray-200">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-gray-400 font-black uppercase tracking-[0.15em] text-[10px] mb-1">Envío a Domicilio</div>
                  <div className="text-gray-400 text-xs font-bold italic line-clamp-1">Esperando dirección para calcular costo...</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-200/50 px-2 py-1 rounded-lg">Pendiente</span>
              </div>
            </div>
          )}

          {shippingMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <div key={method.id} className={`border-2 rounded-[1.5rem] transition-all duration-300 overflow-hidden ${isSelected ? 'border-emerald-600 bg-emerald-50/30 shadow-lg shadow-emerald-900/5 translate-y-[-2px]' : 'border-gray-50 hover:border-emerald-200 bg-white shadow-sm'}`}>
                <label
                  htmlFor={method.id}
                  className="flex items-center justify-between p-5 cursor-pointer"
                >
                  <div className="flex items-center flex-1">
                    <div className="relative flex items-center justify-center">
                      <input
                        id={method.id}
                        name="shippingMethod"
                        type="radio"
                        value={method.id}
                        checked={isSelected}
                        onChange={onMethodChange}
                        className="h-5 w-5 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    
                    <div className="ml-5 flex items-center gap-4">
                      {method.id === 'dynamic' && (
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      )}
                      {method.id === 'pickup' && (
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-900 font-black tracking-tight leading-none mb-1">{method.name}</p>
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{method.days}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {method.price === 0 ? (
                      <span className="text-emerald-600 font-black text-lg">Gratis</span>
                    ) : (
                      <span className="text-gray-900 font-black text-lg">${method.price.toLocaleString('es-CL')}</span>
                    )}
                  </div>
                </label>

                {/* Sub UI for dynamic shipping when selected */}
                {isSelected && method.id === 'dynamic' && (
                  <div className="px-5 pb-5 pt-2 border-t border-emerald-100/50 mt-1">
                     <p className="text-sm font-bold text-gray-900 mb-3">Programa tu entrega:</p>
                     
                     {/* Horizontal Days Selector */}
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {availableDays.map((d, i) => {
                           const dStr = formatDateForApi(d);
                           const isDaySelected = shippingInfo.deliveryDate === dStr;
                           return (
                             <button
                               key={dStr}
                               type="button"
                               onClick={() => handleDateClick(d)}
                               className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                 isDaySelected 
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                               }`}
                             >
                               {formatShortDate(d)}
                             </button>
                           )
                        })}
                     </div>

                     {/* Slots Selector */}
                     <div className="mt-4">
                        {slotsLoading ? (
                           <div className="flex py-4 items-center justify-center text-emerald-600 text-xs font-bold">
                             <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full mr-2" />
                             Cargando horarios...
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 gap-3">
                              {availableSlots.length > 0 ? (
                                availableSlots.map(slot => {
                                  const isSlotSelected = shippingInfo.deliveryTimeSlot === slot.id;
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      disabled={!slot.available}
                                      onClick={() => handleSlotClick(slot.id, slot.available)}
                                      className={`p-3 rounded-xl border-2 text-left relative overflow-hidden transition-all ${
                                        !slot.available 
                                         ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                         : isSlotSelected
                                           ? 'border-emerald-600 bg-emerald-50'
                                           : 'border-gray-200 hover:border-emerald-300 bg-white'
                                      }`}
                                    >
                                      <p className={`text-xs font-black ${!slot.available ? 'text-gray-400' : isSlotSelected ? 'text-emerald-900' : 'text-gray-700'}`}>
                                        {slot.label}
                                      </p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                        {!slot.available ? 'Agotado' : 'Disponible'}
                                      </p>
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="col-span-2 text-center py-4 bg-amber-50 rounded-xl border border-amber-100">
                                  <p className="text-amber-800 text-xs font-bold">No hay horarios disponibles para esta fecha.</p>
                                  <p className="text-amber-600 text-[10px] mt-1">Intenta seleccionando el día siguiente.</p>
                                </div>
                              )}
                           </div>
                        )}
                        {!slotsLoading && shippingInfo.deliveryDate && !shippingInfo.deliveryTimeSlot && availableSlots.some(s => s.available) && (
                          <p className="text-xs font-bold text-red-500 mt-3 animate-pulse">
                            ⚠️ Por favor selecciona un horario para continuar.
                          </p>
                        )}
                     </div>
                  </div>
                )}

                {/* Sub UI for pickup when selected */}
                {isSelected && method.id === 'pickup' && (
                  <div className="px-5 pb-5 pt-2 border-t border-blue-100 mt-1 bg-blue-50/50 rounded-b-[1.3rem]">
                     <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-xs font-medium text-blue-900 leading-relaxed">
                          <strong className="font-black">Importante:</strong> Su pedido estará listo en aproximadamente <strong className="font-black text-blue-700">90 minutos</strong> tras la confirmación del pago. Recibirá un correo electrónico cuando esté listo para retirar.
                        </p>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
