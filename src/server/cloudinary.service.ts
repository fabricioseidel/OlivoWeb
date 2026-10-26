import { v2 as cloudinary } from "cloudinary";
import { logger } from "@/utils/logger";

// Configuración singleton de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
};

/**
 * Sube una imagen (Buffer o Base64) a Cloudinary con optimización automática.
 * @param fileContent El contenido del archivo (Buffer o string base64)
 * @param folder Carpeta de destino en Cloudinary
 */
const UPLOAD_OPTIONS = {
  resource_type: "auto" as const,
  transformation: [
    { width: 1000, height: 1000, crop: "limit" }, // Redimensionar si es muy grande
    { quality: "auto" },                         // Compresión inteligente
    { fetch_format: "auto" },                    // WebP/AVIF automático
  ],
};

function toResult(res: { secure_url: string; public_id: string; width: number; height: number; format: string }): CloudinaryUploadResult {
  return {
    url: res.secure_url,
    publicId: res.public_id,
    width: res.width,
    height: res.height,
    format: res.format,
  };
}

export async function uploadImage(
  fileContent: string | Buffer,
  folder: string = "olivomarket/products"
): Promise<CloudinaryUploadResult> {
  // Base64 (lo que mandan el editor masivo y la pantalla de imágenes) o URL:
  // una sola subida directa. Antes se abría además un upload_stream que nunca
  // se cerraba: la foto subía igual, pero esa conexión quedaba colgada hasta
  // el timeout y dejaba en los logs un "Request Timeout" por cada foto.
  if (!Buffer.isBuffer(fileContent)) {
    try {
      return toResult(await cloudinary.uploader.upload(fileContent, { folder, ...UPLOAD_OPTIONS }));
    } catch (error) {
      logger.error("🔥 Error subiendo a Cloudinary:", error);
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder, ...UPLOAD_OPTIONS }, (error, result) => {
      if (error || !result) {
        logger.error("🔥 Error subiendo a Cloudinary:", error);
        return reject(error);
      }
      resolve(toResult(result));
    });
    uploadStream.end(fileContent);
  });
}

/**
 * Elimina una imagen de Cloudinary.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    logger.error("Error eliminando imagen de Cloudinary:", error);
    return false;
  }
}

/**
 * Genera una URL optimizada on-the-fly para el frontend.
 * Útil para miniaturas o diferentes tamaños.
 */
export function getOptimizedUrl(url: string, options: { width?: number; height?: number; crop?: string } = {}) {
  if (!url || !url.includes("cloudinary.com")) return url;
  
  // Transformación básica: f_auto (formato) y q_auto (calidad)
  let transform = "f_auto,q_auto";
  if (options.width) transform += `,w_${options.width}`;
  if (options.height) transform += `,h_${options.height}`;
  if (options.crop) transform += `,c_${options.crop}`;

  // Insertar la transformación en la URL de Cloudinary
  return url.replace("/upload/", `/upload/${transform}/`);
}
