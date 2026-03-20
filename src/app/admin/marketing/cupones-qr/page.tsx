"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCodeIcon, 
  ArrowDownTrayIcon, 
  SparklesIcon,
  TagIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function QRCouponTool() {
  const [config, setConfig] = useState({
    discount: "15%",
    source: "tienda_fisica",
    primaryColor: "#065f46", // Emerald 800
    accentColor: "#fbbf24", // Amber 400
    title: "Membresía OlivoMarket",
    subtitle: "Regalo Exclusivo Clientes"
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://olivo-market.cl";
  const finalUrl = `${baseUrl}/bienvenidos?ref=${config.source}`;

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx?.drawImage(img, 0, 0, 1000, 1000);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Olivo-${config.source}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Diseñador de Cupones QR 🎨</h1>
          <p className="text-gray-500 font-medium italic uppercase tracking-widest text-[10px]">Herramienta de Crecimiento Offline-to-Online</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Lado Izquierdo: Configuración */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
           <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <SparklesIcon className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">Configura tu Campaña</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                 label="Valor del Descuento" 
                 placeholder="Ej: 15% DCTO" 
                 value={config.discount}
                 onChange={(e) => setConfig({...config, discount: e.target.value})}
                 className="rounded-2xl"
              />
              <Input 
                 label="Referencia de Campaña" 
                 placeholder="Ej: tienda_fisica" 
                 value={config.source}
                 onChange={(e) => setConfig({...config, source: e.target.value})}
                 className="rounded-2xl"
              />
           </div>

           <Input 
              label="Título de la Tarjeta" 
              value={config.title}
              onChange={(e) => setConfig({...config, title: e.target.value})}
              className="rounded-2xl"
           />

           <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                 <GlobeAltIcon className="w-4 h-4" />
                 URL de Destino Final
              </div>
              <code className="text-emerald-700 font-black break-all text-sm">{finalUrl}</code>
           </div>

           <Button onClick={downloadQR} className="w-full h-16 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 group">
              <ArrowDownTrayIcon className="w-5 h-5 mr-3" />
              Descargar Código QR (HD)
           </Button>
        </div>

        {/* Lado Derecho: Previsualización Premium de la Tarjeta */}
        <div className="flex flex-col items-center">
           <div className="w-full aspect-[1.58/1] max-w-md relative group">
              {/* Sombra Dinámica */}
              <div className="absolute inset-4 bg-emerald-900/40 rounded-[2rem] blur-[40px] opacity-20 -z-10 group-hover:scale-110 transition-transform duration-500" />
              
              {/* Cuerpo de la Tarjeta */}
              <div className="w-full h-full rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border border-white/20" style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #064e3b 100%)` }}>
                 
                 {/* Patrón de Fondo sutil (Hojas) */}
                 <div className="absolute top-0 right-0 w-48 h-48 opacity-10 rotate-12 -mr-12 -mt-12">📦</div>

                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-white font-black text-xl tracking-tighter leading-none mb-1">{config.title}</p>
                          <p className="text-emerald-300/80 text-[10px] font-black uppercase tracking-widest italic">{config.subtitle}</p>
                       </div>
                       <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                          <QRCodeSVG 
                            id="qr-code-svg"
                            value={finalUrl} 
                            size={100} 
                            bgColor={"transparent"} 
                            fgColor={"#ffffff"} 
                            level={"H"}
                            includeMargin={false}
                          />
                       </div>
                    </div>

                    <div className="flex items-end justify-between">
                       <div className="space-y-1">
                          <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Incentivo Activo</p>
                          <div className="flex items-center gap-2">
                             <TagIcon className="w-5 h-5 text-amber-400" />
                             <p className="text-3xl font-black text-white tracking-tighter">{config.discount}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-emerald-400 font-black italic text-xs uppercase">Scan & Save</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Float Element (Micro-badge de éxito) */}
              <div className="absolute -top-4 -right-4 bg-amber-400 p-3 rounded-2xl shadow-xl rotate-12 flex items-center justify-center border-4 border-white animate-pulse">
                 <QrCodeIcon className="w-5 h-5 text-amber-900" />
              </div>
           </div>

           <div className="mt-8 text-center space-y-2">
              <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Vista de Membresía de Fidelización</p>
              <p className="text-[10px] text-gray-500 italic max-w-xs">Usa este diseño para dárselo a tu imprenta o generar volantes digitales personalizados.</p>
           </div>
        </div>

      </div>
    </div>
  );
}
