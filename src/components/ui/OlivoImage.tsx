import NextImage, { ImageProps } from "next/image";
import { getOptimizedUrl } from "@/server/cloudinary.service";

interface OlivoImageProps extends Omit<ImageProps, "src"> {
  src: string;
  optimize?: boolean;
}

/**
 * Un wrapper sobre Next.js Image que aplica optimizaciones de Cloudinary on-the-fly.
 * Si la imagen no es de Cloudinary, se comporta como un componente Image normal.
 */
export default function OlivoImage({ src, optimize = true, ...props }: OlivoImageProps) {
  // Solo aplicamos optimización si la URL es de Cloudinary y el prop optimize es true
  let finalSrc = src;
  
  if (optimize && src && src.includes("cloudinary.com")) {
    // Pedir a Cloudinary una versión optimizada específica para el tamaño solicitado
    finalSrc = getOptimizedUrl(src, {
      width: Number(props.width) || undefined,
      height: Number(props.height) || undefined,
      crop: props.fill ? "fill" : "limit"
    });
  }

  // Si no hay src o es un string vacío, podemos mostrar un placeholder
  if (!src) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center rounded-lg ${props.className}`}
        style={{ width: props.width, height: props.height }}
      >
        <span className="text-gray-400 text-xs">Sin imagen</span>
      </div>
    );
  }

  return (
    <NextImage
      src={finalSrc}
      {...props}
      // Usar loader opcional para Cloudinary si fuera necesario en el futuro
    />
  );
}
