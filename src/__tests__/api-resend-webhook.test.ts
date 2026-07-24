import { POST } from '../app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estado compartido entre los mocks y los tests
const db = vi.hoisted(() => ({
  // Fila existente en email_log (null = no hay registro previo)
  emailLogRow: null as { id: number; status: string } | null,
  // Simula que otro evento insertó la fila entre el update y el upsert
  upsertConflict: false,
  logUpdates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
  otherUpdates: [] as Array<{ table: string; values: Record<string, unknown>; match: unknown }>,
  fail: false,
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

vi.mock('@/lib/supabase-server', () => {
  const TERMINAL_MOCK = new Set(['bounced', 'complained', 'failed', 'clicked']);
  return {
    supabaseServer: {
      from: (table: string) => ({
        update: (values: Record<string, unknown>) => ({
          // email_log: .update().eq('resend_id', ...).not(...).select('id')
          eq: (_col: string, _match: unknown) => ({
            not: (_c: string, _op: string, _list: string) => ({
              select: async () => {
                if (db.fail) throw new Error('db caída');
                const row = db.emailLogRow;
                if (row && !TERMINAL_MOCK.has(row.status)) {
                  db.logUpdates.push(values);
                  row.status = String(values.status);
                  return { data: [{ id: row.id }], error: null };
                }
                return { data: [], error: null };
              },
            }),
          }),
          // customers / newsletter_subscribers: .update().ilike('email', ...)
          ilike: async (_col: string, match: unknown) => {
            db.otherUpdates.push({ table, values, match });
            return { data: null, error: null };
          },
        }),
        upsert: (values: Record<string, unknown>, _opts: unknown) => ({
          select: async () => {
            if (db.fail) throw new Error('db caída');
            if (db.upsertConflict) {
              // ON CONFLICT DO NOTHING: la fila ya existe, no se inserta nada
              db.emailLogRow ??= { id: 99, status: 'delivered' };
              return { data: [], error: null };
            }
            db.inserts.push(values);
            db.emailLogRow = { id: 100, status: String(values.status) };
            return { data: [{ id: 100 }], error: null };
          },
        }),
      }),
    },
  };
});

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
    db.emailLogRow = null;
    db.upsertConflict = false;
    db.fail = false;
    db.logUpdates.length = 0;
    db.inserts.length = 0;
    db.otherUpdates.length = 0;
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
    expect(db.logUpdates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
    expect(db.otherUpdates).toHaveLength(0);
  });

  it('ignora eventos no relacionados a emails', async () => {
    svix.verify.mockReturnValue({ type: 'contact.created', data: {} });
    const response = await POST(webhookRequest());
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ignored).toBe('contact.created');
    expect(db.logUpdates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it('actualiza el registro existente de email_log en email.delivered', async () => {
    db.emailLogRow = { id: 7, status: 'sent' };
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(db.logUpdates).toEqual([{ status: 'delivered' }]);
    expect(db.inserts).toHaveLength(0);
    expect(db.emailLogRow.status).toBe('delivered');
  });

  it('no pisa un estado terminal con un evento fuera de orden ni duplica la fila', async () => {
    db.emailLogRow = { id: 7, status: 'bounced' };
    db.upsertConflict = true; // la fila existe: el upsert hace DO NOTHING
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });

    await POST(webhookRequest());
    expect(db.logUpdates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
    expect(db.emailLogRow.status).toBe('bounced');
  });

  it('inserta en email_log si el correo no fue enviado desde la app', async () => {
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_ext', to: 'externo@test.cl', from: 'noreply@olivomarket.cl' },
    });

    await POST(webhookRequest());
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0]).toMatchObject({
      to_email: 'externo@test.cl',
      status: 'delivered',
      resend_id: 're_ext',
    });
    // subject y from_email son NOT NULL en el esquema
    expect(db.inserts[0].subject).toBeTruthy();
    expect(db.inserts[0].from_email).toBeTruthy();
  });

  it('reintenta el update si otro evento insertó la fila en paralelo (carrera)', async () => {
    // No hay fila al hacer el primer update, pero al llegar el upsert ya existe
    db.upsertConflict = true;
    svix.verify.mockReturnValue({
      type: 'email.opened',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_race', to: ['cliente@test.cl'] },
    });

    await POST(webhookRequest());
    // No se insertó fila duplicada y el estado del evento no se perdió
    expect(db.inserts).toHaveLength(0);
    expect(db.logUpdates).toEqual([{ status: 'opened' }]);
    expect(db.emailLogRow?.status).toBe('opened');
  });

  it('marca el email como no verificado y da de baja del newsletter en email.bounced', async () => {
    db.emailLogRow = { id: 3, status: 'sent' };
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

    expect(db.logUpdates).toEqual([{ status: 'bounced', error_message: 'buzón inexistente' }]);

    // El email se normaliza a minúsculas para el match case-insensitive
    const customerUpdate = db.otherUpdates.find((u) => u.table === 'customers');
    expect(customerUpdate?.values).toEqual({ email_verified: false });
    expect(customerUpdate?.match).toBe('cliente@test.cl');

    const newsletterUpdate = db.otherUpdates.find((u) => u.table === 'newsletter_subscribers');
    expect(newsletterUpdate?.values).toMatchObject({ is_active: false });
  });

  it('retira el consentimiento de marketing en email.complained', async () => {
    db.emailLogRow = { id: 4, status: 'delivered' };
    svix.verify.mockReturnValue({
      type: 'email.complained',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_456', to: ['cliente@test.cl'] },
    });

    await POST(webhookRequest());

    const customerUpdate = db.otherUpdates.find((u) => u.table === 'customers');
    expect(customerUpdate?.values).toEqual({ marketing_consent: false });

    const newsletterUpdate = db.otherUpdates.find((u) => u.table === 'newsletter_subscribers');
    expect(newsletterUpdate?.values).toMatchObject({ is_active: false });
  });

  it('responde 200 aunque falle la base de datos (evita reintentos infinitos)', async () => {
    db.fail = true;
    svix.verify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-07-24T12:00:00Z',
      data: { email_id: 're_123', to: ['cliente@test.cl'] },
    });

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
  });
});
