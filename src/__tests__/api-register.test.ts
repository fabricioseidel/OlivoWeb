import { POST } from '../app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashedpassword'),
}));

// Mock auth functions
vi.mock('../lib/auth', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

// Mock loyalty and email services
vi.mock('../server/loyalty.service', () => ({
  addBonusPoints: vi.fn().mockResolvedValue(50),
}));

vi.mock('../server/email.service', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../server/coupon.service', () => ({
  createCoupon: vi.fn().mockResolvedValue({ code: 'OLIVO15-TEST' }),
}));

vi.mock('../lib/supabase-server', () => ({
  supabaseServer: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles POST request with invalid data', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.message).toBeDefined();
  });

  it('registers normal web user and assigns 50 bonus points', async () => {
    const { getUserByEmail, createUser } = await import('../lib/auth');
    const { addBonusPoints } = await import('../server/loyalty.service');
    const { sendWelcomeEmail } = await import('../server/email.service');

    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: 'u1', email: 'test@olivo.cl', name: 'Test User', role: 'USER' } as any);

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@olivo.cl',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.bonusPoints).toBe(50);
    expect(addBonusPoints).toHaveBeenCalledWith({
      customerEmail: 'test@olivo.cl',
      points: 50,
      description: 'Bonus de bienvenida Club OlivoMarket',
    });
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@olivo.cl',
        bonusPoints: 50,
      })
    );
  });

  it('registers tienda_fisica user with 200 points and coupon', async () => {
    const { getUserByEmail, createUser } = await import('../lib/auth');
    const { addBonusPoints } = await import('../server/loyalty.service');

    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: 'u2', email: 'pos@olivo.cl', name: 'Pos User', role: 'USER' } as any);

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pos User',
        email: 'pos@olivo.cl',
        password: 'password123',
        source: 'tienda_fisica',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.bonusPoints).toBe(200);
    expect(data.couponCode).toBe('OLIVO15-TEST');
    expect(addBonusPoints).toHaveBeenCalledWith({
      customerEmail: 'pos@olivo.cl',
      points: 200,
      description: 'Bonus de bienvenida (Tienda Física)',
    });
  });
});
