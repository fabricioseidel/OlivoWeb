import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { successResponse, errorResponse } from "@/lib/api-response";

// Límite de tamaño: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB en bytes

async function ensureUploadsBucket() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.log('Creating uploads bucket...');
      
      const { error: createError } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
        fileSizeLimit: MAX_FILE_SIZE
      });

      if (createError) {
        console.error('Error creating uploads bucket:', createError);
        return false;
      }
      
      console.log('Uploads bucket created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring uploads bucket:', error);
    return false;
  }
}

// POST: Subir imagen para producto Uber Eats
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const contentType = request.headers.get('content-type') || '';
    
    // Manejar FormData (archivo directo)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const barcode = formData.get('barcode') as string | null;

      if (!file) {
        return errorResponse(new Error("No file provided"), 400);
      }

      // Verificar tamaño
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse(
          new Error(`El archivo excede el límite de 2MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`), 
          400
        );
      }

      // Verificar tipo MIME
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return errorResponse(
          new Error(`Tipo de archivo no permitido: ${file.type}. Permitidos: PNG, JPG, WEBP, GIF`), 
          400
        );
      }

      // Asegurar que el bucket existe
      const bucketReady = await ensureUploadsBucket();
      if (!bucketReady) {
        return errorResponse(new Error("Could not ensure uploads bucket exists"), 500);
      }

      // Generar nombre único
      const ext = file.name.split('.').pop() || 'jpg';
      const prefix = barcode ? `uber-${barcode}` : 'uber-product';
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // Convertir File a Buffer
      const arrayBuffer = await file.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Intentar comprimir/redimensionar con Sharp si está disponible
      let sharpInstance: any = null;
      try {
        const mod: any = await import('sharp');
        sharpInstance = mod?.default || mod;
      } catch {}

      if (sharpInstance && ['png', 'jpg', 'jpeg', 'webp'].includes(ext.toLowerCase())) {
        try {
          const maxWidth = 800; // Máximo 800px de ancho para productos
          const quality = 85;
          const pipeline = sharpInstance(buffer).rotate();
          const meta = await pipeline.metadata();
          
          if ((meta.width || 0) > maxWidth) {
            pipeline.resize({ width: maxWidth });
          }
          
          if (ext.toLowerCase() === 'png') {
            buffer = await pipeline.png({ quality }).toBuffer();
          } else if (ext.toLowerCase() === 'webp') {
            buffer = await pipeline.webp({ quality }).toBuffer();
          } else {
            buffer = await pipeline.jpeg({ quality }).toBuffer();
          }
        } catch (err) {
          console.warn('Sharp processing failed, using original:', (err as any)?.message);
        }
      }

      // Subir a Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('uploads')
        .upload(filename, buffer, { 
          contentType: file.type, 
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(filename);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Could not get public URL');
      }

      // Si hay barcode, actualizar el producto en uber_eats_products
      if (barcode) {
        await supabaseAdmin
          .from('uber_eats_products')
          .update({ image_url: publicUrlData.publicUrl })
          .eq('barcode', barcode);
      }

      return successResponse({
        success: true,
        url: publicUrlData.publicUrl,
        path: filename,
        size: buffer.length,
        originalSize: file.size,
      });
    }

    // Manejar JSON con base64
    const body = await request.json();
    const { base64, mimeType, barcode } = body as {
      base64: string;
      mimeType: string;
      barcode?: string;
    };

    if (!base64 || !mimeType) {
      return errorResponse(new Error("base64 and mimeType are required"), 400);
    }

    // Verificar tipo MIME
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return errorResponse(
        new Error(`Tipo de archivo no permitido: ${mimeType}. Permitidos: PNG, JPG, WEBP, GIF`), 
        400
      );
    }

    // Decodificar base64
    const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    let buffer = Buffer.from(base64Data, 'base64');

    // Verificar tamaño
    if (buffer.length > MAX_FILE_SIZE) {
      return errorResponse(
        new Error(`El archivo excede el límite de 2MB. Tamaño actual: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`), 
        400
      );
    }

    // Asegurar que el bucket existe
    const bucketReady = await ensureUploadsBucket();
    if (!bucketReady) {
      return errorResponse(new Error("Could not ensure uploads bucket exists"), 500);
    }

    // Determinar extensión
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[mimeType] || 'jpg';

    // Generar nombre único
    const prefix = barcode ? `uber-${barcode}` : 'uber-product';
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Intentar comprimir/redimensionar con Sharp
    let sharpInstance: any = null;
    try {
      const mod: any = await import('sharp');
      sharpInstance = mod?.default || mod;
    } catch {}

    if (sharpInstance && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      try {
        const maxWidth = 800;
        const quality = 85;
        const pipeline = sharpInstance(buffer).rotate();
        const meta = await pipeline.metadata();
        
        if ((meta.width || 0) > maxWidth) {
          pipeline.resize({ width: maxWidth });
        }
        
        if (ext === 'png') {
          buffer = await pipeline.png({ quality }).toBuffer();
        } else if (ext === 'webp') {
          buffer = await pipeline.webp({ quality }).toBuffer();
        } else {
          buffer = await pipeline.jpeg({ quality }).toBuffer();
        }
      } catch (err) {
        console.warn('Sharp processing failed, using original:', (err as any)?.message);
      }
    }

    // Subir a Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filename, buffer, { 
        contentType: mimeType, 
        upsert: true 
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filename);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Could not get public URL');
    }

    // Si hay barcode, actualizar el producto
    if (barcode) {
      await supabaseAdmin
        .from('uber_eats_products')
        .update({ image_url: publicUrlData.publicUrl })
        .eq('barcode', barcode);
    }

    return successResponse({
      success: true,
      url: publicUrlData.publicUrl,
      path: filename,
      size: buffer.length,
    });

  } catch (e: any) {
    console.error('Image upload error:', e);
    return errorResponse(e);
  }
}
