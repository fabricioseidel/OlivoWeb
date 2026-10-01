import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { borrarComprobante, pathDeRutaInterna, subirComprobante } from '@/server/archivos-privados';
import { requireApiAdminOrSeller } from '@/lib/api-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { id: orderId } = await params;

    const formData = await request.formData();

    const file = formData.get('file') as File;
    const type = formData.get('type') as 'receipt' | 'invoice';

    if (!file || !type) {
      return NextResponse.json(
        { error: 'Archivo y tipo son requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos JPG, PNG, WEBP o PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 10MB' },
        { status: 400 }
      );
    }

    // Bucket privado: una factura de proveedor no es pública. En la base
    // queda la ruta interna /api/admin/archivos, que pide sesión.
    let subido: { path: string; url: string };
    try {
      subido = await subirComprobante(`pedidos-proveedor/${orderId}`, file, type === 'receipt' ? 'comprobante' : 'factura');
    } catch (e) {
      console.error('Error uploading file:', e);
      return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
    }
    const filePath = subido.path;
    const urlData = { publicUrl: subido.url };

    // Actualizar el pedido con la URL del documento
    const updates: any = {};
    if (type === 'receipt') {
      updates.payment_receipt_url = urlData.publicUrl;
      updates.payment_receipt_name = file.name;
    } else {
      updates.invoice_url = urlData.publicUrl;
      updates.invoice_name = file.name;
    }

    const { data, error } = await supabaseServer
      .from('supplier_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      // Si falla la actualización, intentar eliminar el archivo subido
      await borrarComprobante(filePath);

      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payment_receipt_url: data.payment_receipt_url,
      payment_receipt_name: data.payment_receipt_name,
      invoice_url: data.invoice_url,
      invoice_name: data.invoice_name,
    });
  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const type = body.type as 'receipt' | 'invoice';

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo de documento es requerido' },
        { status: 400 }
      );
    }

    // Obtener el pedido para conseguir la URL del archivo
    const { data: order, error: fetchError } = await supabaseServer
      .from('supplier_orders')
      .select('payment_receipt_url, invoice_url')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    const fileUrl = type === 'receipt' ? order.payment_receipt_url : order.invoice_url;

    // Borrar el archivo: en el bucket privado (lo nuevo) o en el público
    // `uploads` (lo subido antes de pasar a privado).
    if (fileUrl) {
      const privado = pathDeRutaInterna(fileUrl);
      if (privado) {
        await borrarComprobante(privado);
      } else {
        const urlParts = fileUrl.split('/uploads/');
        if (urlParts.length > 1) {
          const { error: deleteError } = await supabaseServer.storage.from('uploads').remove([urlParts[1]]);
          if (deleteError) console.error('Error deleting file from storage:', deleteError);
        }
      }
    }

    // Actualizar el pedido removiendo las referencias al archivo
    const updates: any = {};
    if (type === 'receipt') {
      updates.payment_receipt_url = null;
      updates.payment_receipt_name = null;
    } else {
      updates.invoice_url = null;
      updates.invoice_name = null;
    }

    const { error: updateError } = await supabaseServer
      .from('supplier_orders')
      .update(updates)
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete upload API:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
