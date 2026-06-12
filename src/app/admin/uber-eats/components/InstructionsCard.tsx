"use client";

import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export default function InstructionsCard() {
  return (
    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <InformationCircleIcon className="w-5 h-5" />
        Instrucciones para subir a Uber Eats
      </h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
        <li>Selecciona los productos que deseas vender en Uber Eats (máximo recomendado: 200)</li>
        <li>Revisa y corrige las categorías asignadas automáticamente</li>
        <li>Si aplica, ajusta Product Type / Alcohol Units / HFSS</li>
        <li>Verifica que todos los productos seleccionados estén marcados como válidos (✅)</li>
        <li>Haz clic en Exportar CSV para descargar el archivo</li>
        <li>
          Envía el archivo CSV a <strong>mercados@uber.com</strong> para su revisión
        </li>
      </ol>
    </div>
  );
}
