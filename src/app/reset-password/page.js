'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../lib/api';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function getPasswordStrength(pw) {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
    if (score <= 2) return { label: 'Fraca', color: '#ef4444', width: '33%' };
    if (score <= 3) return { label: 'Média', color: '#f59e0b', width: '66%' };
    return { label: 'Forte', color: '#22c55e', width: '100%' };
  }
  const pwStrength = getPasswordStrength(password);

  const submit = async e => {
    e.preventDefault();
    if (password !== confirm) return setError('As senhas não coincidem');
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, email, password });
      setMsg('Senha redefinida com sucesso!');
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Link inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 16 }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 28 }}>💰</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>Redefinir Senha</p>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Confirme seu e-mail para continuar</p>
          </div>

          {msg ? (
            <div style={{ padding: '12px 16px', borderRadius: 8, background: '#052e16', borderLeft: '3px solid #22c55e', textAlign: 'center' }}>
              <p style={{ color: '#22c55e' }}>{msg}</p>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Redirecionando...</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="email" placeholder="Confirme seu e-mail" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Nova senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              {pwStrength && (
                <div style={{ marginTop: -4 }}>
                  <div style={{ height: 4, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pwStrength.width, background: pwStrength.color, transition: 'all 0.3s', borderRadius: 4 }} />
                  </div>
                  <p style={{ fontSize: 11, color: pwStrength.color, marginTop: 4 }}>
                    Força: {pwStrength.label}{pwStrength.label !== 'Forte' && ' — use maiúsculas, números e símbolos'}
                  </p>
                </div>
              )}
              <input type="password" placeholder="Confirmar nova senha" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              {error && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: '#2d0a0a', borderLeft: '3px solid #ef4444' }}>
                  <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
                </div>
              )}
              <button type="submit" className="btn" style={{ background: '#6366f1', color: '#fff', fontWeight: 600, padding: 12 }} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
