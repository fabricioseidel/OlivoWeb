import { afterEach, describe, expect, it, vi } from 'vitest';

const enviar = vi.fn();

vi.mock('@/server/email.service', () => ({
  sendEmail: (...args: unknown[]) => enviar(...args),
}));

const { POST } = await import('@/app/api/contacto/route');

const mensaje = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  asuntoDefault: 'Consulta por un pedido',
};

const pedir = (body: unknown, ip = 'test-ip') =>
  POST({
    headers: new Headers({ 'x-forwarded-for': ip }),
    json: async () => body,
  } as any);

const cuerpo = (extra: Record<string, string> = {}) => ({
  name: mensaje.name,
  email: mensaje.email,
  subject: mensaje.asuntoDefault,
  message: '¿Llega mañana?',
  ...extra,
});

describe('API /contacto', () => {
  afterEach(() => {
    enviar.mockReset();
  });

  it('manda el mensaje al correo del local y deja responder al cliente', async () => {
    // Antes esta ruta esperaba 300 ms y devolvía ok sin enviar nada: el
    // formulario decía "Mensaje enviado" y el mensaje no llegaba a ninguna parte.
    enviar.mockResolvedValue({ ok: true, id: 'abc' });
    const res = await pedir(cuerpo(), 'ip-envio');

    expect(res.status).toBe(200);
    expect(enviar).toHaveBeenCalledTimes(1);
    const payload = enviar.mock.calls[0][0] as any;
    expect(payload.to).toBe('olivomarket1@gmail.com');
    expect(payload.replyTo).toBe(mensaje.email);
    expect(payload.html).toContain('¿Llega mañana?');
  });

  it('no confirma el envío cuando el correo falla', async () => {
    enviar.mockResolvedValue({ ok: false, error: 'resend caído' });
    const res = await pedir(cuerpo(), 'ip-falla');
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/WhatsApp/);
  });

  it('escapa el HTML del mensaje', async () => {
    enviar.mockResolvedValue({ ok: true });
    await pedir(cuerpo({ message: '<script>alert(1)</script>' }), 'ip-escape');

    const payload = enviar.mock.calls[0][0] as any;
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });

  it('rechaza campos faltantes sin gastar un envío', async () => {
    const res = await pedir({ name: 'Ana', email: 'ana@example.com' }, 'ip-faltantes');

    expect(res.status).toBe(400);
    expect(enviar).not.toHaveBeenCalled();
  });
});
