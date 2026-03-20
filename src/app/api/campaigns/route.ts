import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { sendEmail } from "@/server/email.service";

// GET /api/campaigns — List campaigns
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (!["ADMIN", "SELLER"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/campaigns — Create campaign
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { data, error } = await supabaseServer
      .from("campaigns")
      .insert({
        name: body.name,
        subject: body.subject,
        html_content: body.html_content || null,
        audience: body.audience || "all",
        status: "draft",
        created_by: session.user?.email || "",
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/campaigns — Update or send campaign
export async function PATCH(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (action === "send") {
      // Send campaign to subscribers
      const { data: campaign } = await supabaseServer
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (!campaign) {
        return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
      }

      // Update status to sending
      await supabaseServer
        .from("campaigns")
        .update({ status: "sending" })
        .eq("id", id);

      // Get subscribers
      let subscribers: any[] = [];
      if (campaign.audience === "newsletter" || campaign.audience === "all") {
        const { data } = await supabaseServer
          .from("newsletter_subscribers")
          .select("email, name")
          .eq("is_active", true);
        subscribers = data || [];
      }

      if (campaign.audience === "customers" || campaign.audience === "all") {
        const { data } = await supabaseServer
          .from("customers")
          .select("email, name")
          .eq("marketing_consent", true);
        if (data) {
          // Merge, avoiding duplicates
          const existingEmails = new Set(subscribers.map((s: any) => s.email));
          data.forEach((c: any) => {
            if (!existingEmails.has(c.email)) {
              subscribers.push(c);
            }
          });
        }
      }

      // Send to each subscriber (with rate limiting)
      let sent = 0;
      let failed = 0;

      const htmlContent =
        campaign.html_content ||
        `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:24px">
          <h1 style="color:#064E3B;font-size:24px">${campaign.subject}</h1>
          <p>Hola,</p>
          <p>Te traemos novedades de OlivoMarket.</p>
          <p style="color:#6B7280;font-size:12px;margin-top:32px">
            <a href="#" style="color:#10B981">Desuscribirse</a>
          </p>
        </div>`;

      // Insert recipients
      const recipientRows = subscribers.map((s: any) => ({
        campaign_id: id,
        email: s.email,
        name: s.name || null,
        status: "pending",
      }));

      if (recipientRows.length > 0) {
        await supabaseServer.from("campaign_recipients").insert(recipientRows);
      }

      // Send emails in batches of 10
      const BATCH_SIZE = 10;
      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((sub: any) =>
            sendEmail({
              to: sub.email,
              toName: sub.name,
              subject: campaign.subject,
              html: htmlContent.replace(/\{\{customerName\}\}/g, sub.name || "Cliente"),
              templateSlug: "campaign",
              metadata: { campaignId: id },
            })
          )
        );

        results.forEach((r, idx) => {
          const email = batch[idx].email;
          if (r.status === "fulfilled" && r.value.ok) {
            sent++;
            supabaseServer
              .from("campaign_recipients")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("campaign_id", id)
              .eq("email", email);
          } else {
            failed++;
            supabaseServer
              .from("campaign_recipients")
              .update({
                status: "failed",
                error_message: r.status === "rejected" ? String(r.reason) : "Send failed",
              })
              .eq("campaign_id", id)
              .eq("email", email);
          }
        });

        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < subscribers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Update campaign stats
      await supabaseServer
        .from("campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          stats: { total: subscribers.length, sent, opened: 0, clicked: 0, failed },
        })
        .eq("id", id);

      return NextResponse.json({ ok: true, sent, failed, total: subscribers.length });
    }

    // Regular update
    const { error } = await supabaseServer
      .from("campaigns")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
