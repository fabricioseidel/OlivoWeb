"use client";
import { useRef } from "react";

interface SingleImageUploadProps {
  label?: string;
  value: string; // data URL o vacío
  onChange: (dataUrl: string) => void;
  error?: string;
  required?: boolean;
  maxSizeKB?: number; // default 2048 (2MB)
}

export default function SingleImageUpload({ label = "Imagen", value, onChange, error, required, maxSizeKB = 2048 }: SingleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen");
      return;
    }
    const maxBytes = maxSizeKB * 1024;
    if (file.size > maxBytes) {
      const mb = (maxSizeKB / 1024).toFixed(2);
      alert(`La imagen supera el límite de ${mb}MB (${maxSizeKB}KB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-3 ${error ? 'border-red-300' : 'border-gray-300'} bg-gray-50`}>        
        {value ? (
          <div className="w-full">
            <div className="relative group">
              <img src={value} alt="preview" className="max-h-48 mx-auto rounded-md object-contain" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-600 text-xs px-2 py-1 rounded shadow"
              >Quitar</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 text-center">Arrastra una imagen o haz clic para seleccionar. Máx { (maxSizeKB/1024).toFixed(2) }MB.</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 hover:bg-gray-100"
            >Seleccionar</button>
          </>
        )}
        <input
          ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onInputChange}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
