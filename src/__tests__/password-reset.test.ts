import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El punto delicado de la recuperación de contraseña es que un enlace vencido,
 * ya usado o inexistente NUNCA cambie la contraseña. Estos tests cubren esos
 * tres casos más el camino feliz.
 */

const state: {
  row: any;
  updateUserError: any;
  updates: Array<{ table: string; values: any }>;
} = { row: null, updateUserError: null, updates: [] };

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hash-nuevo') },
  hash: vi.fn().mockResolvedValue('hash-nuevo'),
}));

vi.mock('@/lib/supabase-server', () => {
  const builder = (table: string) => {
    const api: any = {
      select: () => api,
      eq: () => api,
      is: () => api,
      maybeSingle: async () =>
        table === 'password_reset_tokens'
          ? { data: state.row, error: null }
          : { data: null, error: null },
      update: (values: any) => {
        state.updates.push({ table, values });
        const chain: any = {
          eq: () => chain,
          is: () => chain,
          then: (resolve: any) =>
            resolve({ error: table === 'users' ? state.updateUserError : null }),
        };
        return chain;
      },
      insert: async () => ({ error: null }),
    };
    return api;
  };
  return { supabaseServer: { from: (table: string) => builder(table) } };
});

import { consumePasswordResetToken } from '@/server/password-reset.service';

const futuro = () => new Date(Date.now() + 60_000).toISOString();
const pasado = () => new Date(Date.now() - 60_000).toISOString();

describe('consumePasswordResetToken', () => {
  beforeEach(() => {
    state.row = null;
    state.updateUserError = null;
    state.updates = [];
  });

  it('rechaza un token inexistente sin tocar la contraseña', async () => {
    state.row = null;
    const res = await consumePasswordResetToken('no-existe', 'nuevaclave');
    expect(res).toEqual({ ok: false, reason: 'invalid' });
    expect(state.updates.filter((u) => u.table === 'users')).toHaveLength(0);
  });

  it('rechaza un token vencido sin tocar la contraseña', async () => {
    state.row = { id: 't1', user_id: 'u1', expires_at: pasado(), used_at: null };
    const res = await consumePasswordResetToken('vencido', 'nuevaclave');
    expect(res).toEqual({ ok: false, reason: 'expired' });
    expect(state.updates.filter((u) => u.table === 'users')).toHaveLength(0);
  });

  it('rechaza un token ya usado sin tocar la contraseña', async () => {
    state.row = {
      id: 't1',
      user_id: 'u1',
      expires_at: futuro(),
      used_at: new Date().toISOString(),
    };
    const res = await consumePasswordResetToken('usado', 'nuevaclave');
    expect(res).toEqual({ ok: false, reason: 'used' });
    expect(state.updates.filter((u) => u.table === 'users')).toHaveLength(0);
  });

  it('con un token vigente cambia la contraseña y marca el token como usado', async () => {
    state.row = { id: 't1', user_id: 'u1', expires_at: futuro(), used_at: null };
    const res = await consumePasswordResetToken('vigente', 'nuevaclave');
    expect(res).toEqual({ ok: true });

    const userUpdate = state.updates.find((u) => u.table === 'users');
    expect(userUpdate?.values.password_hash).toBe('hash-nuevo');

    const tokenUpdate = state.updates.find(
      (u) => u.table === 'password_reset_tokens' && u.values.used_at
    );
    expect(tokenUpdate).toBeDefined();
  });

  it('no marca el token como usado si falla el cambio de contraseña', async () => {
    state.row = { id: 't1', user_id: 'u1', expires_at: futuro(), used_at: null };
    state.updateUserError = { message: 'boom' };

    const res = await consumePasswordResetToken('vigente', 'nuevaclave');
    expect(res).toEqual({ ok: false, reason: 'invalid' });

    const tokenUpdate = state.updates.find(
      (u) => u.table === 'password_reset_tokens' && u.values.used_at
    );
    expect(tokenUpdate).toBeUndefined();
  });
});
