"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClockIcon, CheckCircleIcon, ArrowRightIcon, MapPinIcon, EyeIcon } from "@heroicons/react/24/outline";

export interface LiveOrder {
  id: string;
  total?: number;
  productos?: number;
  createdAt?: string;
  estado?: string;
  customer?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items?: any[];
}

interface LiveReceptionBoardProps {
  orders: LiveOrder[];
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export default function LiveReceptionBoard({ orders, onUpdateStatus }: LiveReceptionBoardProps) {
  // Sort orders by oldest first (since it's a queue)
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [orders]);

  const newOrders = sortedOrders.filter(o => o.estado === "Pendiente" || o.estado === "pending");
  const inPrepOrders = sortedOrders.filter(o => o.estado === "Procesando");
  const readyOrders = sortedOrders.filter(o => o.estado === "Gestionado" || o.estado === "Enviado");

  const getElapsedTime = (dateString?: string) => {
    if (!dateString) return "Desconocido";
    const minDiff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (minDiff < 1) return "Recién llegado";
    if (minDiff < 60) return `${minDiff} min`;
    const h = Math.floor(minDiff / 60);
    const m = minDiff % 60;
    return `${h}h ${m}m`;
  };

  const OrderCard = ({ order, nextAction, nextStatus, isWarning = false }: { order: LiveOrder, nextAction: string, nextStatus: string, isWarning?: boolean }) => {
    const timeColor = isWarning ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50";

    return (
      <div className={`bg-white rounded-3xl p-5 border-2 ${isWarning ? 'border-amber-200 shadow-amber-100/50' : 'border-gray-100 shadow-gray-200/50'} shadow-xl flex flex-col gap-4 transition-all hover:scale-[1.02] group`}>
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
              {(order.customer || 'C')[0].toUpperCase()}
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-base leading-tight truncate w-32">{order.customer || 'Invitado'}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">#{order.id.substring(0,6)}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${timeColor}`}>
            <ClockIcon className="w-4 h-4 outline-2" />
            <span className="text-xs font-black tracking-widest uppercase">{getElapsedTime(order.createdAt)}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
          <div>
            <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">Total</p>
            <p className="font-black text-xl text-emerald-600">${Number(order.total || 0).toLocaleString('es-CL')}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mb-1">{order.productos} Items</p>
             <div className="flex items-center justify-end gap-1">
                <span className={`w-2 h-2 rounded-full ${order.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-xs font-bold text-gray-700">{order.paymentStatus === 'paid' ? 'Pagado' : 'Pago Pendiente'}</span>
             </div>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          <Link href={`/admin/pedidos/${order.id}`} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl transition-colors flex items-center justify-center gap-1">
             <EyeIcon className="w-4 h-4" /> Ver
          </Link>
          <button onClick={() => onUpdateStatus(order.id, nextStatus)} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
            {nextAction} <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-10">
      
      {/* Columna 1: Nuevos */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
            NUEVOS
          </h2>
          <span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full text-xs">{newOrders.length}</span>
        </div>
        
        {newOrders.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl h-32 flex items-center justify-center text-gray-400 font-medium text-sm">Sin pedidos nuevos</div>
        ) : (
          newOrders.map(order => <OrderCard key={order.id} order={order} nextAction="A Preparación" nextStatus="Procesando" isWarning={true} />)
        )}
      </div>

      {/* Columna 2: Preparando */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            EN PREPARACIÓN
          </h2>
          <span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full text-xs">{inPrepOrders.length}</span>
        </div>
        
        {inPrepOrders.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl h-32 flex items-center justify-center text-gray-400 font-medium text-sm">Nada en preparación</div>
        ) : (
          inPrepOrders.map(order => <OrderCard key={order.id} order={order} nextAction="Marcar Listo" nextStatus="Gestionado" />)
        )}
      </div>

      {/* Columna 3: Listos o Enviados */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            LISTOS / ENVIADOS
          </h2>
          <span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-full text-xs">{readyOrders.length}</span>
        </div>
        
        {readyOrders.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl h-32 flex items-center justify-center text-gray-400 font-medium text-sm">Nada listo aún</div>
        ) : (
          readyOrders.map(order => <OrderCard key={order.id} order={order} nextAction="Cerrar Pedido" nextStatus="Completado" />)
        )}
      </div>

    </div>
  );
}
