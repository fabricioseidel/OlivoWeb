/**
 * Redimensiona y comprime una imagen en el navegador antes de enviarla al
 * servidor. Las fotos tomadas con celular suelen pesar 5-12MB, lo que excede
 * el límite de payload de las Server Actions (y el límite duro de 4.5MB de
 * las funciones serverless de Vercel), provocando el error genérico
 * "An unexpected response was received from the server". Comprimir en el
 * cliente evita ese error y acelera la subida.
 */
export function compressImageFile(
  file: File,
  options: { maxDimension?: number; quality?: number; maxOutputBytes?: number } = {}
): Promise<string> {
  const { maxDimension = 1600, quality = 0.82, maxOutputBytes = 3 * 1024 * 1024 } = options;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length * 0.75 > maxOutputBytes && q > 0.4) {
          q -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string") return "/file.svg";
  if (src.startsWith("http") || src.startsWith("/")) return src;
  // Permite usar rutas guardadas como "uploads/..." desde BD
  return `/${src.replace(/^\/+/, "")}`;
}

/**
 * Legacy alias for normalizeImage - for backward compatibility
 */
export const normalizeImageUrl = normalizeImage;

/**
 * Adds a random timestamp to an image URL to prevent caching
 * @param url The image URL to add a timestamp to
 * @returns The URL with a random timestamp parameter
 */
export function getImageUrlWithRandomTimestamp(url?: string | null) {
  if (!url) return "/file.svg";
  // Normalizar primero para asegurar que la URL es válida
  const normalizedUrl = normalizeImage(url);
  // Añadir parámetros para evitar caché
  const separator = normalizedUrl.includes('?') ? '&' : '?';
  return `${normalizedUrl}${separator}t=${Date.now()}&r=${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Gets a properly sized banner image URL
 * @param url The banner image URL
 * @param size The size of the banner (small, medium, or large)
 * @returns The URL with appropriate size parameters
 */
export function getBannerImageUrl(url?: string | null, size: 'small' | 'medium' | 'large' = 'medium') {
  if (!url) return "/file.svg";
  const normalizedUrl = normalizeImage(url);
  
  // Determinar dimensiones basadas en tamaño
  let dimensions = '';
  switch(size) {
    case 'small': dimensions = 'w=800&h=400'; break;
    case 'medium': dimensions = 'w=1200&h=600'; break;
    case 'large': dimensions = 'w=1920&h=800'; break;
  }
  
  // Add size parameter for future responsive image support
  const separator = normalizedUrl.includes('?') ? '&' : '?';
  return `${normalizedUrl}${separator}${dimensions}&t=${Date.now()}&r=${Math.floor(Math.random() * 1000000)}`;
}
