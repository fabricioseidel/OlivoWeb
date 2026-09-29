import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';
import { subirComprobante } from '@/server/archivos-privados';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAdminOrSeller();
    if (!auth.ok) return auth.response;

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no debe superar los 10MB' }, { status: 400 });
    }

    // Bucket privado: el comprobante de transferencia de un cliente trae su
    // nombre, banco y RUT. En la base queda la ruta interna, que pide sesión.
    const { path: fileName, url: publicUrl } = await subirComprobante(`ventas/${saleId}`, file, 'comprobante');

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
