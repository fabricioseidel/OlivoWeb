import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// Cliente con service role para storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos JPG, PNG o PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 5MB' },
        { status: 400 }
      );
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `supplier-orders/${fileName}`;

    // Subir archivo a Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Error al subir el archivo' },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Error al obtener URL del archivo' },
        { status: 500 }
      );
    }

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
      await supabaseAdmin.storage.from('uploads').remove([filePath]);
      
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
    
    // Extraer el path del archivo de la URL
    if (fileUrl) {
      const urlParts = fileUrl.split('/uploads/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Eliminar archivo de Storage
        const { error: deleteError } = await supabaseAdmin.storage
          .from('uploads')
          .remove([filePath]);

        if (deleteError) {
          console.error('Error deleting file from storage:', deleteError);
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
