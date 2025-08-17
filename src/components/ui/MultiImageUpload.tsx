"use client";
import { useRef } from "react";

interface MultiImageUploadProps {
  label?: string;
  values: string[]; // data URLs
  onChange: (dataUrls: string[]) => void;
  maxImages?: number;
  maxSizeKB?: number; // per image (default 2048KB = 2MB)
}

export default function MultiImageUpload({ label = "Galería", values, onChange, maxImages = 5, maxSizeKB = 2048 }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, maxImages - values.length);
    const readers: Promise<string>[] = files.map(file => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) return reject("Formato no válido");
  if (file.size > maxSizeKB * 1024) return reject(`Archivo supera ${(maxSizeKB/1024).toFixed(2)}MB`);
      const fr = new FileReader();
      fr.onload = e => resolve(e.target?.result as string);
      fr.onerror = () => reject("Error de lectura");
      fr.readAsDataURL(file);
    }));
    Promise.allSettled(readers).then(results => {
      const ok = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value);
      if (ok.length) onChange([...values, ...ok].slice(0, maxImages));
    });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeAt = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {values.map((src, idx) => (
          <div key={idx} className="relative group border rounded-md overflow-hidden bg-white">
            <img src={src} alt={`img-${idx}`} className="h-28 w-full object-cover" />
            <button type="button" onClick={() => removeAt(idx)} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 text-xs px-1.5 py-0.5 rounded shadow">x</button>
          </div>
        ))}
        {values.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-28 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >Añadir</button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onInputChange}
        className="hidden"
      />
  <p className="text-xs text-gray-500">Máx {maxImages} imágenes. Cada una hasta {(maxSizeKB/1024).toFixed(2)}MB.</p>
    </div>
  );
}
