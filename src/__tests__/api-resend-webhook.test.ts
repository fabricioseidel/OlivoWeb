import { POST } from '../app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estado compartido entre los mocks y los tests
const db = vi.hoisted(() => ({
  existingRow: null as { id: number; status: string } | null,
  updates: [] as Array<{ table: string; values: Record<string, unknown>; match: unknown }>,
  inserts: [] as Array<{ table: string; values: Record<string, unknown> }>,
  selects: [] as Array<{ table: string }>,
}));

const svix = vi.hoisted(() => ({
  verify: vi.fn(),
}));

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({ verify: svix.verify })),
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (table: string) => ({
      select: () => {
        db.selects.push({ table });
        return {
          eq: () => ({
            maybeSingle: async () => ({ data: db.existingRow, error: null }),
          }),
        };
      },
      update: (values: Record<string, unknown>) => ({
        eq: async (_col: string, match: unknown) => {
          db.updates.push({ table, values, match });
          return { data: null, error: null };
        },
        ilike: async (_col: string, match: unknown) => {
          db.updates.push({ table, values, match });
          return { data: null, error: null };
        },
      }),
      insert: async (values: Record<string, unknown>) => {
        db.inserts.push({ table, values });
        return { data: null, error: null };
      },
    }),
  },
}));

function webhookRequest(body: unknown = {}) {
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'svix-id': 'msg_test',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,firma',
    },
  });
}

describe('/api/webhooks/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.existingRow = null;
    db.updates.length = 0;
    db.inserts.length = 0;
    db.selects.length = 0;
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  });

  it('responde 500 si falta RESEND_WEBHOOK_SECRET', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const response = await POST(webhookRequest());
    expect(response.status).toBe(500);
  });

  it('responde 401 con firma inválida y no toca la base de datos', async () => {
    svix.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const response = await POST(webhookRequest());
    expect(response.status).toBe(401);
    expect(db.selects).toHaveLength(0);
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it('ignora eventos no relacionados a emails', async () => {
    svix.verify.mockReturnValue({ type: 'contact.created', data: {} });
    const response = await POST(webhookRequest());
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ignored).toBe('contact.created');
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it('actualiza el registro existente de email_log en email.delivered', async () => {
    db.existingRow = { id: 7, status: 'sent' };
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(db.updates).toEqual([
      { table: 'email_log', values: { status: 'delivered' }, match: 7 },
    ]);
    expect(db.inserts).toHaveLength(0);
  });

  it('no pisa un estado terminal con un evento fuera de orden', async () => {
    db.existingRow = { id: 7, status: 'bounced' };
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });

    await POST(webhookRequest());
    expect(db.updates.filter((u) => u.table === 'email_log')).toHaveLength(0);
  });

  it('inserta en email_log si el correo no fue enviado desde la app', async () => {
    db.existingRow = null;
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_ext', to: 'externo@test.cl', from: 'noreply@olivomarket.cl' },
    });

    await POST(webhookRequest());
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe('email_log');
    expect(db.inserts[0].values).toMatchObject({
      to_email: 'externo@test.cl',
      status: 'delivered',
      resend_id: 're_ext',
    });
    // subject y from_email son NOT NULL en el esquema
    expect(db.inserts[0].values.subject).toBeTruthy();
    expect(db.inserts[0].values.from_email).toBeTruthy();
  });

  it('marca el email como no verificado y da de baja del newsletter en email.bounced', async () => {
    db.existingRow = { id: 3, status: 'sent' };
    svix.verify.mockReturnValue({
      type: 'email.bounced',
      created_at: '2026-07-24T12:00:00Z',
      data: {
        email_id: 're_123',
        to: ['Cliente@Test.CL'],
        bounce: { message: 'buzón inexistente' },
      },
    });

    await POST(webhookRequest());

    const logUpdate = db.updates.find((u) => u.table === 'email_log');
    expect(logUpdate?.values).toMatchObject({ status: 'bounced', error_message: 'buzón inexistente' });

    // El email se normaliza a minúsculas para el match case-insensitive
    const customerUpdate = db.updates.find((u) => u.table === 'customers');
    expect(customerUpdate?.values).toEqual({ email_verified: false });
    expect(customerUpdate?.match).toBe('cliente@test.cl');

    const newsletterUpdate = db.updates.find((u) => u.table === 'newsletter_subscribers');
    expect(newsletterUpdate?.values).toMatchObject({ is_active: false });
  });

  it('retira el consentimiento de marketing en email.complained', async () => {
    db.existingRow = { id: 4, status: 'delivered' };
    svix.verify.mockReturnValue({
      type: 'email.complained',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_456', to: ['cliente@test.cl'] },
    });

    await POST(webhookRequest());

    const customerUpdate = db.updates.find((u) => u.table === 'customers');
    expect(customerUpdate?.values).toEqual({ marketing_consent: false });

    const newsletterUpdate = db.updates.find((u) => u.table === 'newsletter_subscribers');
    expect(newsletterUpdate?.values).toMatchObject({ is_active: false });
  });

  it('responde 200 aunque falle la base de datos (evita reintentos infinitos)', async () => {
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });
    db.existingRow = null;
    // Forzar un fallo en la inserción
    const originalPush = db.inserts.push.bind(db.inserts);
    db.inserts.push = () => {
      throw new Error('db caída');
    };

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    db.inserts.push = originalPush;
  });
});
