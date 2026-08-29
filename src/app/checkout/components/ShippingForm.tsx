import React, { useState, useEffect, useMemo } from 'react';
import Input from "@/components/ui/Input";
import AddressAutocomplete, { AddressResult } from "@/components/AddressAutocomplete";
import {
  firstSelectableDate,
  primeraFechaEconomica,
  slotsEconomicosForDate,
  slotsForDate,
} from "@/lib/delivery-slots";

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
  /** Precio final a cobrar, ya con tope por comuna y envío gratis aplicados. */
  price: number;
  days: string;
  /** Tarifa antes del ajuste, solo si difiere de `price` (se muestra tachada). */
  originalPrice?: number;
}

interface ShippingFormProps {
  shippingInfo: ShippingInfo;
  onChange: (e: any) => void;
  onAddressSelect: (val: AddressResult | string) => void;
  shippingMethods: ShippingMethod[];
  selectedMethod: string;
  onMethodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCalculating?: boolean;
  fieldErrors?: Partial<Record<"fullName" | "email" | "phone" | "address", string>>;
}

// Format YYYY-MM-DD
const formatDateForApi = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Próximos días con despacho. Se saltan los días en que el local no abre:
 * ofrecer una fecha sin bloques deja al cliente mirando una lista vacía.
 *
 * El económico además arranca más tarde: su ronda sale en la mañana y el
 * pedido se prepara el día anterior, así que hoy nunca es una opción.
 */
const getNextDays = (numDays: number, esEconomico = false) => {
  const days: Date[] = [];
  const today = new Date();
  const desde = esEconomico
    ? primeraFechaEconomica(
        formatDateForApi(today),
        today.getHours() * 60 + today.getMinutes()
      )
    : null;

  for (let i = 0; days.length < numDays && i < numDays * 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dStr = formatDateForApi(d);
    if (desde && dStr < desde) continue;
    const tiene = esEconomico
      ? slotsEconomicosForDate(dStr).length > 0
      : slotsForDate(dStr).length > 0;
    if (tiene) days.push(d);
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
  isCalculating,
  fieldErrors = {}
}: ShippingFormProps) {
  
  // Las dos modalidades no ofrecen los mismos días: el económico reparte en su
  // ronda y arranca recién mañana, así que la lista se recalcula al cambiar de
  // método en vez de fijarse una sola vez.
  const esEconomico = selectedMethod === 'economico';
  const esAgendable = selectedMethod === 'dynamic' || esEconomico;
  const availableDays = useMemo(
    () => (esAgendable ? getNextDays(7, esEconomico) : []),
    [esAgendable, esEconomico]
  ); // 7 días con despacho
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ id: string; label: string; available: boolean; capacityRatio: string }[]>([]);

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
    // Se preselecciona la primera fecha que admite despacho, no "hoy" a secas:
    // pasada la hora de corte hoy ya no tiene bloques, y el cliente entraba
    // directo a "no hay horarios disponibles para esta fecha".
    if (esAgendable && !shippingInfo.deliveryDate && availableDays.length > 0) {
       const now = new Date();
       const hoy = formatDateForApi(now);
       const inicial = esEconomico
         ? primeraFechaEconomica(hoy, now.getHours() * 60 + now.getMinutes())
         : firstSelectableDate(hoy, now.getHours());
       if (inicial) onChange({ target: { name: 'deliveryDate', value: inicial } });
    }
  }, [esAgendable, esEconomico, shippingInfo.deliveryDate, availableDays, onChange]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!esAgendable || !shippingInfo.deliveryDate) return;
      
      setSlotsLoading(true);
      setSlotsError(false);
      try {
        // El servidor decide la disponibilidad con la grilla de la modalidad:
        // pedir los bloques de una y agendar en la otra ofrecería horarios en
        // los que no sale nadie a repartir.
        const res = await fetch(
          `/api/shipping/slots?date=${shippingInfo.deliveryDate}${esEconomico ? "&mode=economico" : ""}`
        );
        if (!res.ok) throw new Error(`Slots request failed (${res.status})`);

        const data = await res.json();
        setAvailableSlots(data.slots || []);

        // Si el slot actual ya no está disponible, lo quitamos
        if (shippingInfo.deliveryTimeSlot) {
           const currentSlot = data.slots.find((s: any) => s.id === shippingInfo.deliveryTimeSlot);
           if (!currentSlot || !currentSlot.available) {
              onChange({ target: { name: 'deliveryTimeSlot', value: '' } });
           }
        }
      } catch (err) {
        console.error("Fetch slots error:", err);
        setSlotsError(true);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    
    fetchSlots();
    // Nota: omitimos `onChange` (se recrea en cada render del padre) y
    // `shippingInfo.deliveryTimeSlot` (este efecto lo limpia él mismo);
    // incluirlos provocaría re-fetch en bucle. Solo debe ejecutarse al
    // cambiar la fecha o el método de envío.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <h2 className="o-h3 mb-5 text-neutral-900">Información de envío</h2>

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
            error={fieldErrors.fullName}
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
            error={fieldErrors.email}
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
            error={fieldErrors.phone}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-neutral-700">Dirección</label>
          <AddressAutocomplete
            id="address"
            name="address"
            value={shippingInfo.address}
            onChange={onAddressSelect}
            placeholder="Calle, número, comuna..."
            country="cl"
            required
          />
          {fieldErrors.address && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1">
              <span>⚠️</span>
              {fieldErrors.address}
            </p>
          )}
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
          <h3 className="o-h3 text-neutral-900">Método de envío</h3>
          {isCalculating && (
            <div className="flex items-center text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full animate-pulse">
              <div className="animate-spin h-3.3 w-3.5 border-2 border-brand-600 border-t-transparent rounded-full mr-2" />
              Calculando distancia...
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(!shippingMethods.find(m => m.id === 'dynamic')) && (
            <div className="flex items-center justify-between p-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mr-4 border border-gray-200">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div>
                  <div className="mb-0.5 text-sm font-medium text-neutral-500">Envío a domicilio</div>
                  <div className="text-gray-400 text-xs font-bold italic line-clamp-1">Esperando dirección para calcular costo...</div>
                </div>
              </div>
              <div className="text-right">
                <span className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600">Pendiente</span>
              </div>
            </div>
          )}

          {shippingMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <div key={method.id} className={`overflow-hidden rounded-xl border transition-colors ${isSelected ? 'border-brand-500 bg-brand-50/50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
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
                        className="h-5 w-5 text-brand-600 border-gray-300 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                    
                    <div className="ml-5 flex items-center gap-4">
                      {method.id === 'dynamic' && (
                        <div className="w-12 h-12 rounded-2xl bg-brand-boton text-brand-contraste flex items-center justify-center shadow-lg shadow-brand-600/20">
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
                        <p className="mb-0.5 text-sm font-semibold leading-snug text-neutral-900">{method.name}</p>
                        <p className="text-xs leading-relaxed text-neutral-500">{method.days}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {typeof method.originalPrice === 'number' && (
                      <span className="block text-gray-400 line-through font-bold text-xs">
                        ${method.originalPrice.toLocaleString('es-CL')}
                      </span>
                    )}
                    {method.price === 0 ? (
                      <span className="text-[15px] font-semibold text-brand-700">Gratis</span>
                    ) : (
                      <span className="tabular text-[15px] font-semibold text-neutral-900">${method.price.toLocaleString('es-CL')}</span>
                    )}
                  </div>
                </label>

                {/* Agenda de entrega: la usan las dos modalidades a domicilio. */}
                {isSelected && (method.id === 'dynamic' || method.id === 'economico') && (
                  <div className="px-5 pb-5 pt-2 border-t border-brand-100/50 mt-1">
                     <p className="text-sm font-bold text-gray-900 mb-3">Programa tu entrega:</p>
                     
                     {/* Horizontal Days Selector */}
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {availableDays.map((d) => {
                           const dStr = formatDateForApi(d);
                           const isDaySelected = shippingInfo.deliveryDate === dStr;
                           return (
                             <button
                               key={dStr}
                               type="button"
                               onClick={() => handleDateClick(d)}
                               className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                 isDaySelected 
                                  ? 'border-brand-600 bg-brand-boton text-brand-contraste shadow-md' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300'
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
                           <div className="flex py-4 items-center justify-center text-brand-600 text-xs font-bold">
                             <div className="animate-spin h-4 w-4 border-2 border-brand-600 border-t-transparent rounded-full mr-2" />
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
                                           ? 'border-brand-600 bg-brand-50'
                                           : 'border-gray-200 hover:border-brand-300 bg-white'
                                      }`}
                                    >
                                      <p className={`text-sm font-medium ${!slot.available ? 'text-neutral-400' : isSlotSelected ? 'text-brand-900' : 'text-neutral-700'}`}>
                                        {slot.label}
                                      </p>
                                      <p className="mt-0.5 text-xs text-neutral-500">
                                        {!slot.available ? 'Agotado' : 'Disponible'}
                                      </p>
                                    </button>
                                  )
                                })
                              ) : slotsError ? (
                                <div role="alert" className="col-span-2 text-center py-4 bg-red-50 rounded-xl border border-red-100">
                                  <p className="text-red-700 text-xs font-bold">No pudimos cargar los horarios de despacho.</p>
                                  <p className="mt-1 text-xs text-red-600">Revisa tu conexión y vuelve a seleccionar la fecha.</p>
                                </div>
                              ) : (
                                <div className="col-span-2 text-center py-4 bg-amber-50 rounded-xl border border-amber-100">
                                  <p className="text-amber-800 text-xs font-bold">No hay horarios disponibles para esta fecha.</p>
                                  <p className="mt-1 text-xs text-amber-700">Intenta seleccionando el día siguiente.</p>
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
                          <strong className="font-semibold">Importante:</strong> Su pedido estará listo en aproximadamente <strong className="font-semibold text-neutral-900">90 minutos</strong> tras la confirmación del pago. Recibirá un correo electrónico cuando esté listo para retirar.
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
