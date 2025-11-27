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
