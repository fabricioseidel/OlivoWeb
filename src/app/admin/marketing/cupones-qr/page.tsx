"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCodeIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  TagIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { PageShell, HeroHeader } from "@/components/admin/shell";

export default function QRCouponTool() {
  const [config, setConfig] = useState({
    discount: "15%",
    source: "tienda_fisica",
    primaryColor: "#065f46",
    accentColor: "#fbbf24",
    title: "Membresía OlivoMarket",
    subtitle: "Regalo Exclusivo Clientes",
  });

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://olivo-market.cl";
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
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Diseñador de Cupones QR"
          subtitle="Herramienta de crecimiento offline-to-online — diseñá tarjetas físicas con QR que llevan a tu tienda"
          icon={<QrCodeIcon className="w-6 h-6 text-emerald-300" />}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Lado Izquierdo: Configuración */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm ring-1 ring-gray-200 space-y-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <SparklesIcon className="w-5 h-5" />
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Configurá tu campaña
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor del descuento"
              placeholder="Ej: 15% DCTO"
              value={config.discount}
              onChange={(e) =>
                setConfig({ ...config, discount: e.target.value })
              }
              className="rounded-xl"
            />
            <Input
              label="Referencia de campaña"
              placeholder="Ej: tienda_fisica"
              value={config.source}
              onChange={(e) =>
                setConfig({ ...config, source: e.target.value })
              }
              className="rounded-xl"
            />
          </div>

          <Input
            label="Título de la tarjeta"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            className="rounded-xl"
          />

          <div className="p-5 bg-gray-50 rounded-2xl ring-1 ring-dashed ring-gray-200">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              <GlobeAltIcon className="w-4 h-4" />
              URL de destino final
            </div>
            <code className="text-emerald-700 font-black break-all text-sm">
              {finalUrl}
            </code>
          </div>

          <Button
            onClick={downloadQR}
            className="w-full h-14 rounded-xl font-black text-base bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-3" />
            Descargar código QR (HD)
          </Button>
        </div>

        {/* Lado Derecho: Previsualización */}
        <div className="flex flex-col items-center">
          <div className="w-full aspect-[1.58/1] max-w-md relative group">
            <div className="absolute inset-4 bg-emerald-900/40 rounded-3xl blur-[40px] opacity-20 -z-10 group-hover:scale-110 transition-transform duration-500" />

            <div
              className="w-full h-full rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${config.primaryColor} 0%, #064e3b 100%)`,
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 opacity-10 rotate-12 -mr-12 -mt-12 text-7xl">
                📦
              </div>

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-black text-lg sm:text-xl tracking-tighter leading-none mb-1">
                      {config.title}
                    </p>
                    <p className="text-emerald-300/80 text-[10px] font-black uppercase tracking-widest italic">
                      {config.subtitle}
                    </p>
                  </div>
                  <div className="bg-white/10 p-2 sm:p-3 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={finalUrl}
                      size={84}
                      bgColor="transparent"
                      fgColor="#ffffff"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">
                      Incentivo activo
                    </p>
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-5 h-5 text-amber-400" />
                      <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                        {config.discount}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-black italic text-xs uppercase">
                      Scan &amp; Save
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-3 -right-3 bg-amber-400 p-2.5 rounded-2xl shadow-xl rotate-12 flex items-center justify-center border-4 border-white animate-pulse">
              <QrCodeIcon className="w-5 h-5 text-amber-900" />
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center space-y-2 px-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">
              Vista previa de tarjeta de membresía
            </p>
            <p className="text-[10px] text-gray-500 italic max-w-xs">
              Usá este diseño para dárselo a tu imprenta o generar volantes
              digitales personalizados.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
