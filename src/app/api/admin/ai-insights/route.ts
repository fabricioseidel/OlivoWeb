import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    // 1. Fetch products with low stock relative to their optimum
    const { data: products, error: pError } = await supabaseServer
      .from('products')
      .select('id, name, barcode, stock, optimum_stock, min_stock, image_url, sale_price')
      .gt('optimum_stock', 0); // Only products that have an optimum configured

    if (pError) throw pError;

    // 2. We will look at top 50 recent orders within 14 days
    const { data: recentOrders, error: oError } = await supabaseServer
      .from('orders')
      .select('id, created_at, items')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (oError) throw oError;

    // 3. Heuristic Engine: Calculate velocity (units sold / 14 days)
    const salesMap = new Map<string, number>();
    
    recentOrders?.forEach(order => {
      if (Array.isArray(order.items)) {
         order.items.forEach((item: any) => {
             const key = item.productId || item.id || item.product_id;
             if (key) {
                salesMap.set(key, (salesMap.get(key) || 0) + (item.quantity || 1));
             }
         });
      }
    });

    const insights = [];

    // Evaluate each product
    for (const p of products || []) {
      const soldLast14Days = salesMap.get(p.id) || salesMap.get(p.barcode) || 0;
      const velocityPerDay = soldLast14Days / 14;
      
      if (velocityPerDay > 0) {
        const daysUntilEmpty = p.stock / velocityPerDay;
        
        // Insight 1: Rapid depletion (will empty in < 5 days but stock > min_stock so it hasn't triggered normal alerts yet)
        if (daysUntilEmpty < 5 && p.stock > (p.min_stock || 1)) {
          insights.push({
            type: 'depletion_warning',
            severity: 'high',
            productId: p.id,
            productName: p.name,
            image: p.image_url,
            message: `Las ventas han aumentado (${soldLast14Days} unids. en 14 días). Se agotará en aprox. ${Math.ceil(daysUntilEmpty)} días.`,
            actionMessage: 'Sugerimos adelantar el reabastecimiento.',
            metrics: { velocity: velocityPerDay.toFixed(1), daysLeft: Math.ceil(daysUntilEmpty), stock: p.stock }
          });
        }
        
        // Insight 2: High demand missing optimum (selling faster than optimum configuration allows)
        if (velocityPerDay * 7 > (p.optimum_stock || 20)) {
           insights.push({
            type: 'optimum_too_low',
            severity: 'medium',
            productId: p.id,
            productName: p.name,
            image: p.image_url,
            message: `El ritmo de venta supera tu "Stock Óptimo" configurado. Vendes ${Math.ceil(velocityPerDay * 7)} semanales pero pides máximo ${p.optimum_stock}.`,
            actionMessage: 'Considera aumentar el Nivel Óptimo.',
            metrics: { velocity: velocityPerDay.toFixed(1), optimum: p.optimum_stock, weekSales: Math.ceil(velocityPerDay * 7) }
          });
        }
      }
    }

    // Sort by severity
    insights.sort((a, b) => a.severity === 'high' ? -1 : 1);

    return NextResponse.json({
       generatedAt: new Date().toISOString(),
       insights: insights.slice(0, 10) // Top 10 most relevant insights
    });

  } catch (error) {
     console.error("AI Insights Error:", error);
     return NextResponse.json({ error: "No se pudieron calcular los insights." }, { status: 500 });
  }
}
