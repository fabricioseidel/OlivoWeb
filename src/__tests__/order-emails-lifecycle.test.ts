import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendOrderConfirmation,
  sendOrderPreparingEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderStatusEmail,
  getTemplate,
  renderTemplate,
} from "../server/email.service";

// Hoist mock state
const resendState = vi.hoisted(() => ({
  sentEmails: [] as any[],
  mockSend: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: resendState.mockSend.mockImplementation(async (payload: any) => {
          resendState.sentEmails.push(payload);
          return { data: { id: "re_mock_id_999" }, error: null };
        }),
      },
    })),
  };
});

const dbState = vi.hoisted(() => ({
  templates: {} as Record<string, any>,
  logs: [] as any[],
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: (table: string) => ({
      select: (_cols?: string) => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => ({
            data: dbState.templates[val] || null,
            error: null,
          }),
          single: async () => ({
            data: dbState.templates[val] || null,
            error: dbState.templates[val] ? null : { message: "Not found" },
          }),
        }),
      }),
      insert: async (val: any) => {
        dbState.logs.push(val);
        return { data: val, error: null };
      },
    }),
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Order Emails Lifecycle & Personalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resendState.sentEmails = [];
    dbState.logs = [];
    dbState.templates = {};
  });

  it("renderTemplate replaces variables correctly", () => {
    const tpl = "Hola {{name}}, tu total es {{total}}";
    const res = renderTemplate(tpl, { name: "Fabricio", total: "$15.000" });
    expect(res).toBe("Hola Fabricio, tu total es $15.000");
  });

  it("getTemplate supports database template with body_html", async () => {
    dbState.templates["test_slug"] = {
      subject: "Asunto DB",
      body_html: "<p>Hola {{name}} desde DB</p>",
    };

    const tpl = await getTemplate("test_slug", "Fallback Subj", "<p>Fallback</p>");
    expect(tpl.subject).toBe("Asunto DB");
    expect(tpl.html).toContain("desde DB");
  });

  it("getTemplate supports database template with html_body (migration 31 column)", async () => {
    dbState.templates["test_slug_legacy"] = {
      subject: "Asunto Legacy",
      html_body: "<p>Hola {{name}} desde html_body</p>",
    };

    const tpl = await getTemplate("test_slug_legacy", "Fallback Subj", "<p>Fallback</p>");
    expect(tpl.subject).toBe("Asunto Legacy");
    expect(tpl.html).toContain("desde html_body");
  });

  it("sendOrderConfirmation sends email with proper unit price, line totals and points", async () => {
    const result = await sendOrderConfirmation({
      to: "cliente@olivo.cl",
      customerName: "Camila",
      orderId: "ORD-101",
      total: 25000,
      itemCount: 2,
      paymentMethod: "Mercado Pago",
      items: [
        { name: "Aceite de Oliva Extra Virgen 500ml", quantity: 2, price: 8000 },
        { name: "Pasta Gourmet Trufada", quantity: 1, price: 9000 },
      ],
      pointsEarned: 25,
      pointsBalance: 150,
    });

    expect(result.ok).toBe(true);
    expect(resendState.sentEmails.length).toBe(1);

    const sent = resendState.sentEmails[0];
    expect(sent.to).toEqual(["cliente@olivo.cl"]);
    expect(sent.subject).toContain("ORD-101");
    // Unit price x quantity line check
    expect(sent.html).toContain("2 un. x $8.000");
    expect(sent.html).toContain("$16.000"); // Line total
    expect(sent.html).toContain("1 un. x $9.000");
    expect(sent.html).toContain("$9.000");
    // Points block
    expect(sent.html).toContain("¡Sumaste 25 puntos con este pedido!");
    expect(sent.html).toContain("150 puntos");
    // WhatsApp link
    expect(sent.html).toContain("wa.me");
  });

  it("sendOrderPreparingEmail sends stage-specific preparing email with gourmet care note", async () => {
    const result = await sendOrderPreparingEmail({
      to: "cliente@olivo.cl",
      customerName: "Rodrigo",
      orderId: "ORD-102",
      address: "Av. Providencia 1234, Providencia",
      shippingMethod: "Despacho Programado",
    });

    expect(result.ok).toBe(true);
    const sent = resendState.sentEmails[0];
    expect(sent.subject).toContain("se está preparando con cuidado");
    expect(sent.html).toContain("EN PREPARACIÓN");
    expect(sent.html).toContain("Cadena de Frío Garantizada");
    expect(sent.html).toContain("Av. Providencia 1234");
    expect(sent.html).toContain("Despacho Programado");
  });

  it("sendOrderShippedEmail sends tracking details and delivery warnings", async () => {
    const result = await sendOrderShippedEmail({
      to: "cliente@olivo.cl",
      customerName: "Daniela",
      orderId: "ORD-103",
      address: "Av. Grecia 4500, Ñuñoa",
      shippingMethod: "Envío Flash (Uber Direct)",
      trackingUrl: "https://direct.uber.com/tracking/ub123",
      trackingNumber: "UBER-FLASH-987",
    });

    expect(result.ok).toBe(true);
    const sent = resendState.sentEmails[0];
    expect(sent.subject).toContain("va en camino!");
    expect(sent.subject).toContain("ORD-103");
    expect(sent.html).toContain("EN CAMINO");
    expect(sent.html).toContain("https://direct.uber.com/tracking/ub123");
    expect(sent.html).toContain("UBER-FLASH-987");
  });

  it("sendOrderDeliveredEmail includes feedback review link and club points summary", async () => {
    const result = await sendOrderDeliveredEmail({
      to: "cliente@olivo.cl",
      customerName: "Ignacio",
      orderId: "ORD-104",
      address: "Alférez Real 1500, Providencia",
      pointsEarned: 50,
      pointsBalance: 320,
    });

    expect(result.ok).toBe(true);
    const sent = resendState.sentEmails[0];
    expect(sent.subject).toContain("ha sido entregado!");
    expect(sent.subject).toContain("ORD-104");
    expect(sent.html).toContain("ENTREGADO CON ÉXITO");
    expect(sent.html).toContain("+50 pts");
    expect(sent.html).toContain("320 pts");
    expect(sent.html).toContain("https://olivomarket.cl/feedback/ORD-104");
  });

  it("sendOrderCancelledEmail notifies customer with reason and refunded points", async () => {
    const result = await sendOrderCancelledEmail({
      to: "cliente@olivo.cl",
      customerName: "Matías",
      orderId: "ORD-105",
      cancelReason: "Pago no completado en Mercado Pago",
      pointsRefunded: 75,
      paymentRefunded: false,
    });

    expect(result.ok).toBe(true);
    const sent = resendState.sentEmails[0];
    expect(sent.subject).toContain("ORD-105");
    expect(sent.html).toContain("PEDIDO CANCELADO");
    expect(sent.html).toContain("Pago no completado en Mercado Pago");
    expect(sent.html).toContain("Se han devuelto <strong>75 puntos</strong>");
  });

  it("sendOrderStatusEmail routes accurately to preparing, shipped, delivered, and cancelled", async () => {
    // 1. Preparing route
    await sendOrderStatusEmail({
      to: "cliente@olivo.cl",
      customerName: "Ana",
      orderId: "ORD-201",
      status: "Procesando",
      address: "Dirección 1",
    });
    expect(resendState.sentEmails[resendState.sentEmails.length - 1].subject).toContain("se está preparando");

    // 2. Shipped route
    await sendOrderStatusEmail({
      to: "cliente@olivo.cl",
      customerName: "Ana",
      orderId: "ORD-202",
      status: "Enviado",
      address: "Dirección 2",
      trackingUrl: "https://tracking.com/123",
    });
    expect(resendState.sentEmails[resendState.sentEmails.length - 1].subject).toContain("va en camino!");

    // 3. Delivered route
    await sendOrderStatusEmail({
      to: "cliente@olivo.cl",
      customerName: "Ana",
      orderId: "ORD-203",
      status: "Completado",
      address: "Dirección 3",
      pointsEarned: 30,
    });
    expect(resendState.sentEmails[resendState.sentEmails.length - 1].subject).toContain("ha sido entregado!");

    // 4. Cancelled route
    await sendOrderStatusEmail({
      to: "cliente@olivo.cl",
      customerName: "Ana",
      orderId: "ORD-204",
      status: "Cancelado",
      cancelReason: "Falta de stock en sucursal",
    });
    expect(resendState.sentEmails[resendState.sentEmails.length - 1].subject).toContain("ORD-204");
    expect(resendState.sentEmails[resendState.sentEmails.length - 1].html).toContain("Falta de stock en sucursal");
  });
});
