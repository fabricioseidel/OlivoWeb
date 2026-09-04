import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sendOrderStatusEmail } from '@/server/email.service';
import { requireApiAdminOrSeller } from '@/lib/api-auth';
import { auditLog } from '@/server/audit.service';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const { data: order, error } = await supabaseServer
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error in GET order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireApiAdminOrSeller();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    try {
        const body = await request.json();
        const { status, payment_status } = body;
        
        const updateData: any = {};
        if (status) updateData.status = status;
        if (payment_status) updateData.payment_status = payment_status;

        const { error } = await supabaseServer
            .from('orders')
            .update(updateData)
            .eq('id', id);
            
        if (error) {
            console.error('Error updating order:', error);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

        await auditLog({
            action: 'ORDER_STATUS_CHANGED',
            entity: 'orders',
            entityId: id,
            actor: auth.session.user?.email || auth.userId,
            details: updateData,
        });

        // Trigger email notification if status changed
        if (status) {
            try {
                const norm = String(status).toLowerCase();
                const isCancellation = ['cancelled', 'cancelado', 'rechazado'].includes(norm);
                const isShipping = ['shipped', 'enviado', 'en_camino'].includes(norm);

                // Fetch store settings to check toggles if configured
                const { data: storeSettings } = await supabaseServer
                  .from('settings')
                  .select('shipping_confirmation_enabled, order_cancellation_enabled')
                  .maybeSingle();

                const skipEmail =
                  (isCancellation && storeSettings?.order_cancellation_enabled === false) ||
                  (isShipping && storeSettings?.shipping_confirmation_enabled === false);

                if (!skipEmail) {
                    // Fetch customer details for the email
                    const { data: order, error: fetchError } = await supabaseServer
                        .from('orders')
                        .select('*, shipping_address')
                        .eq('id', id)
                        .single();

                    if (!fetchError && order) {
                        const addressData = typeof order.shipping_address === 'string' 
                            ? JSON.parse(order.shipping_address) 
                            : (order.shipping_address || {});
                        
                        const fullAddress = addressData.formattedAddress 
                          || (addressData.address ? `${addressData.address}${addressData.city ? `, ${addressData.city}` : ''}` : 'Dirección registrada');

                        if (addressData.email) {
                            await sendOrderStatusEmail({
                                to: addressData.email,
                                customerName: addressData.fullName || 'Cliente',
                                orderId: id,
                                status: status,
                                address: fullAddress,
                                shippingMethod: order.shipping_method,
                                trackingNumber: order.tracking_number,
                                trackingUrl: order.tracking_url,
                            });
                        }
                    }
                }
            } catch (emailError) {
                console.warn('[Email] Failed to send status update email:', emailError);
            }
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
