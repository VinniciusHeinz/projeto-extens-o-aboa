'use client';
import { useState, useEffect, Suspense } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

function AnimatedBackground() {
  const particles = [
    { symbol: '$', x: 8, y: 15, size: 18, dur: 18, delay: 0 },
    { symbol: '$', x: 20, y: 70, size: 24, dur: 22, delay: 2 },
    { symbol: '📈', x: 35, y: 30, size: 20, dur: 16, delay: 4 },
    { symbol: '💹', x: 50, y: 80, size: 22, dur: 20, delay: 1 },
    { symbol: '📊', x: 90, y: 35, size: 22, dur: 17, delay: 2 },
    { symbol: '$', x: 55, y: 45, size: 14, dur: 21, delay: 3 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #0d1f3c 70%, #0a1628 100%)' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#6366f1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          fontSize: p.size,
          opacity: 0.08,
          color: '#6366f1',
          animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          userSelect: 'none',
          filter: 'blur(0.5px)',
        }}>
          {p.symbol}
        </div>
      ))}

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          100% { transform: translateY(-30px) rotate(10deg); opacity: 0.14; }
        }
      `}</style>
    </div>
  );
}

function AuthForm() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado de reset de senha via Chave Mestra
  const [resetForm, setResetForm] = useState({
    email: '',
    masterKey: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetLoading, setResetLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccess('Conta verificada! Faça login para continuar.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const submitLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setResetLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: resetForm.email,
        masterKey: resetForm.masterKey,
        newPassword: resetForm.newPassword
      });
      setSuccess(data.message || 'Senha redefinida com sucesso!');
      setForm({ email: resetForm.email, password: '' });
      setResetForm({ email: '', masterKey: '', newPassword: '', confirmPassword: '' });
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <AnimatedBackground />
        <div style={{ width: '100%', maxWidth: 410, padding: 16, position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img src="/logo.svg" alt="Logo ABOA" style={{ width: 48, height: 48, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Redefinir Senha — ABOA</p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                Informe o e-mail da diretoria e a Chave de Segurança da ONG
              </p>
            </div>

            <form onSubmit={submitReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>E-mail cadastrado *</label>
                <input
                  type="email"
                  placeholder="diretoria@aboa.org.br"
                  value={resetForm.email}
                  onChange={e => setResetForm({ ...resetForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  🔑 Chave de Segurança da ONG *
                </label>
                <input
                  type="password"
                  placeholder="Digite a chave mestra de recuperação"
                  value={resetForm.masterKey}
                  onChange={e => setResetForm({ ...resetForm, masterKey: e.target.value })}
                  required
                  style={{ borderColor: '#f59e0b' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Nova senha (mín. 6 caracteres) *</label>
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={resetForm.newPassword}
                  onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Confirmar nova senha *</label>
                <input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={resetForm.confirmPassword}
                  onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              {error && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: '#2d0a0a', borderLeft: '3px solid #ef4444' }}>
                  <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{ background: '#22c55e', color: '#0f172a', fontWeight: 700, padding: 12, marginTop: 4 }}
                disabled={resetLoading}
              >
                {resetLoading ? 'Redefinindo...' : '✓ Confirmar Nova Senha'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{ width: '100%', marginTop: 14, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
            >
              ← Voltar para o login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <AnimatedBackground />
      <div style={{ width: '100%', maxWidth: 400, padding: 16, position: 'relative', zIndex: 1 }}>
        <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 26 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo.svg" alt="Logo ABOA" style={{ width: 56, height: 56, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 19, fontWeight: 700, color: '#f8fafc', margin: 0 }}>ABOA — Gestão & Prestação de Contas</p>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Acesso exclusivo da Diretoria</p>
          </div>

          <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>E-mail</label>
              <input name="email" type="email" placeholder="Seu e-mail de acesso" value={form.email} onChange={handle} required />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Senha</label>
              <input name="password" type="password" placeholder="Sua senha" value={form.password} onChange={handle} required />
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: '#2d0a0a', borderLeft: '3px solid #ef4444' }}>
                <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>
              </div>
            )}

            {success && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: '#052e16', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#22c55e', fontSize: 12, margin: 0 }}>{success}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn"
              style={{ background: '#6366f1', color: '#fff', fontWeight: 700, padding: '12px', marginTop: 6 }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '10px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            🔑 Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthScreen() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f172a' }} />}>
      <AuthForm />
    </Suspense>
  );
}