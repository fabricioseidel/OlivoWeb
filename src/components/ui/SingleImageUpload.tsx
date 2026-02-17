"use client";
import { useRef } from "react";

interface SingleImageUploadProps {
  label?: string;
  value: string; // data URL o vacío
  onChange: (dataUrl: string) => void;
  error?: string;
  required?: boolean;
  maxSizeKB?: number; // default 2048 (2MB)
  className?: string;
}

export default function SingleImageUpload({
  label = "Imagen",
  value,
  onChange,
  error,
  required,
  maxSizeKB = 2048,
  className = ""
}: SingleImageUploadProps) {
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-3 ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-gray-100'
          } transition-colors cursor-pointer`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {value ? (
          <div className="w-full">
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 text-xs px-2 py-1 rounded-md shadow opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 text-center font-medium">
              Arrastra una imagen o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 text-center">
              Formatos aceptados: JPG, PNG, WebP. Máx {(maxSizeKB / 1024).toFixed(1)}MB
            </p>
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
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
