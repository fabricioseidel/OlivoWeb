"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, SparklesIcon, GiftIcon } from "@heroicons/react/24/outline";

export default function PuntosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loyalty, setLoyalty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/puntos");
    } else if (status === "authenticated" && session?.user?.email) {
      const fetchLoyalty = async () => {
        try {
          const res = await fetch(`/api/loyalty?email=${session.user.email}`);
          if (res.ok) setLoyalty(await res.json());
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLoyalty();
    }
  }, [status, session, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const { points = 0, tier, nextTier, pointsToNextTier, history = [], totalEarned = 0, totalRedeemed = 0 } = loyalty || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/mi-cuenta" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-emerald-600 mb-6 transition-colors">
        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Volver a Mi Cuenta
      </Link>
      
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Club OlivoMarket</h1>
        <p className="text-gray-500 font-medium">Conoce tus beneficios y el historial de tus puntos acumulados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="relative z-10">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Nivel Actual</p>
                   <div className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md" style={{ backgroundColor: tier?.color ? `${tier.color}40` : '' }}>
                     <p className="font-bold text-lg">{tier?.name || 'Socio'}</p>
                   </div>
                </div>
                <SparklesIcon className="w-12 h-12 text-emerald-300 opacity-50" />
             </div>
             
             <div>
               <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Puntos Disponibles</p>
               <p className="text-5xl font-black">{points.toLocaleString()} <span className="text-sm font-medium tracking-normal opacity-70">pts</span></p>
             </div>

             <div className="mt-8 pt-6 border-t border-white/20">
               {nextTier ? (
                 <p className="text-sm font-medium">Te faltan <strong className="font-black text-emerald-200">{pointsToNextTier} pts</strong> para alcanzar el nivel <strong className="font-black">{nextTier.name}</strong> y mejorar tus beneficios.</p>
               ) : (
                 <p className="text-sm font-black text-emerald-200 uppercase tracking-widest">¡Has alcanzado el nivel máximo del club!</p>
               )}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-center">
           <div className="mb-6 flex items-center gap-3">
              <GiftIcon className="w-8 h-8 text-emerald-500" />
              <h3 className="text-lg font-black text-gray-900">Resumen</h3>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                 <span className="text-sm font-bold text-gray-500">Puntos Ganados</span>
                 <span className="font-black text-emerald-600">+{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                 <span className="text-sm font-bold text-gray-500">Puntos Canjeados</span>
                 <span className="font-black text-red-500">-{totalRedeemed.toLocaleString()}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50">
         <h2 className="text-2xl font-black text-gray-900 mb-6">Historial de Transacciones</h2>
         {history.length > 0 ? (
           <div className="space-y-4">
             {history.map((tx: any) => (
               <div key={tx.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900">{tx.description}</p>
                    <p className="text-xs font-medium text-gray-500">{new Date(tx.created_at).toLocaleDateString()} - {new Date(tx.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className={`font-black ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="text-center py-10">
             <p className="text-gray-500 font-medium">Aún no tienes movimientos de puntos.</p>
           </div>
         )}
      </div>
    </div>
  );
}
