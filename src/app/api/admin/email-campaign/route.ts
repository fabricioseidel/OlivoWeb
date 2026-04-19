import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail, getTemplate, renderTemplate } from "@/server/email.service";

/** Trigger a mass email campaign */
export async function POST(req: NextRequest) {
  try {
    const { templateSlug, customVariables = {} } = await req.json();

    if (!templateSlug) {
      return NextResponse.json({ error: "templateSlug is required" }, { status: 400 });
    }

    // 1. Fetch template
    const template = await getTemplate(templateSlug, "", "");
    if (!template.html) {
      return NextResponse.json({ error: "Template not found or has no content" }, { status: 404 });
    }

    // 2. Fetch active subscribers
    const { data: subscribers, error: subError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email, name")
      .eq("is_active", true);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: "No active subscribers found" }, { status: 200 });
    }

    // 3. Send emails (Sequential to avoid rate limits/Resend abuse in one burst)
    // In a real production app, this should be moved to a background job/Queues (Redis/Inngest)
    const results = [];
    for (const sub of subscribers) {
      const vars = {
        ...customVariables,
        customerName: sub.name || "Cliente",
        year: new Date().getFullYear(),
      };

      const html = renderTemplate(template.html, vars);
      const res = await sendEmail({
        to: sub.email,
        subject: renderTemplate(template.subject, vars),
        html,
        templateSlug,
        metadata: { campaign: true }
      });
      results.push({ email: sub.email, ok: res.ok });
    }

    return NextResponse.json({ 
      success: true, 
      processed: subscribers.length,
      results 
    });

  } catch (error: any) {
    console.error("[Campaign API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
