"use client";

import React from "react";

export default function TestComponent() {
  return (
    <div className="bg-red-500 text-white p-4 m-4">
      <h1 className="text-2xl font-bold">Test Tailwind CSS</h1>
      <p className="text-sm">Si puedes ver este texto en rojo con padding, Tailwind está funcionando.</p>
      <div className="flex space-x-4 mt-4">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Botón Azul
        </button>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Botón Verde
        </button>
      </div>
    </div>
  );
}
