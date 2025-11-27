import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const saleId = id;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar que sea una imagen
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no válido. Use JPG, PNG, WEBP o HEIC' 
      }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `comprobante-${saleId}-${timestamp}-${randomStr}.${ext}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { error: uploadError } = await supabaseServer.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obtener URL pública
    const { data: urlData } = supabaseServer.storage
      .from('uploads')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Actualizar la venta con la URL del comprobante
    const { error: updateError } = await supabaseServer
      .from('sales')
      .update({ 
        transfer_receipt_uri: publicUrl,
        transfer_receipt_name: fileName 
      })
      .eq('id', saleId);

    if (updateError) {
      console.error('Error updating sale:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName 
    });
  } catch (error) {
    console.error('Error in upload receipt API:', error);
    return NextResponse.json(
      { error: 'Error al subir comprobante' },
      { status: 500 }
    );
  }
}
