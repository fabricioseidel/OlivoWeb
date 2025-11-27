'use client';

import { useState } from 'react';

export default function DebugBootstrapPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('Administrador');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-setup-token': token.trim(),
        },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(JSON.stringify({ status: res.status, data }, null, 2));
    } catch (err: any) {
      setResult(`Error: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Debug: Bootstrap Admin</h1>
      <p className="text-sm text-gray-500">Esta página es solo para desarrollo. Ingresa el token de setup y las credenciales del admin para crearlo/promoverlo.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Setup Token (x-setup-token)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="un_token_seguro"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Crear/Promover ADMIN'}
        </button>
      </form>
      {result && (
        <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-3 text-sm">{result}</pre>
      )}
    </div>
  );
}
