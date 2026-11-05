'use client';
import { useState, useEffect, Suspense } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

function AnimatedBackground() {
  const particles = [
    { symbol: '₿', x: 8, y: 15, size: 18, dur: 18, delay: 0 },
    { symbol: '$', x: 20, y: 70, size: 24, dur: 22, delay: 2 },
    { symbol: '📈', x: 35, y: 30, size: 20, dur: 16, delay: 4 },
    { symbol: '💹', x: 50, y: 80, size: 22, dur: 20, delay: 1 },
    { symbol: '€', x: 65, y: 20, size: 20, dur: 25, delay: 3 },
    { symbol: '💰', x: 78, y: 60, size: 18, dur: 19, delay: 5 },
    { symbol: '📊', x: 90, y: 35, size: 22, dur: 17, delay: 2 },
    { symbol: '¥', x: 15, y: 50, size: 16, dur: 23, delay: 6 },
    { symbol: '$', x: 55, y: 45, size: 14, dur: 21, delay: 3 },
    { symbol: '₿', x: 82, y: 85, size: 16, dur: 24, delay: 1 },
    { symbol: '💎', x: 42, y: 10, size: 18, dur: 20, delay: 4 },
    { symbol: '📉', x: 70, y: 75, size: 16, dur: 18, delay: 7 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #0d1f3c 70%, #0a1628 100%)' }}>
      {/* Grade de linhas */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#6366f1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Linha de gráfico animada */}
      <svg style={{ position: 'absolute', bottom: '15%', left: 0, width: '100%', height: '200px', opacity: 0.12 }}>
        <polyline
          points="0,150 100,120 200,140 300,80 400,100 500,60 600,90 700,40 800,70 900,30 1000,50 1100,20 1200,45 1400,10"
          fill="none" stroke="#22c55e" strokeWidth="2"
          style={{ animation: 'drawLine 4s ease-in-out infinite alternate' }}
        />
        <polyline
          points="0,180 150,160 300,170 450,130 600,150 750,110 900,130 1050,90 1200,110 1400,80"
          fill="none" stroke="#6366f1" strokeWidth="1.5"
          style={{ animation: 'drawLine 5s ease-in-out infinite alternate-reverse' }}
        />
      </svg>

      {/* Partículas flutuantes */}
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

      {/* Brilhos */}
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', animation: 'pulse 8s ease-in-out 2s infinite' }} />

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          100% { transform: translateY(-30px) rotate(10deg); opacity: 0.14; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes drawLine {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

function AuthForm() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Força da senha
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
  const pwStrength = mode === 'register' ? getPasswordStrength(form.password) : null;

  // Verificação de email concluída
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccess('E-mail confirmado! Faça login para continuar.');
      window.history.replaceState({}, '', '/');
    }
    if (params.get('error') === 'token_invalido') {
      setError('Link de verificação inválido ou expirado.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(''); setShowResend(false);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, form);
      if (mode === 'register') {
        setSuccess('Conta criada! Verifique seu e-mail para ativar.');
        setMode('login');
        setForm({ name: '', email: form.email, password: '' });
      } else {
        login(data.token, data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao conectar';
      setError(msg);
      if (msg.includes('Confirme seu e-mail')) {
        setShowResend(true);
        setResendEmail(form.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail });
      setSuccess('Novo link enviado! Verifique sua caixa de entrada.');
      setShowResend(false);
      setError('');
    } catch {
      setError('Erro ao reenviar. Tente novamente.');
    } finally {
      setResendLoading(false);
    }
  };

  const sendForgot = async e => {
    e.preventDefault();
    setForgotLoading(true); setForgotMsg('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg('Se o e-mail existir, você receberá as instruções em breve.');
    } catch {
      setForgotMsg('Erro ao enviar. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <AnimatedBackground />
        <div style={{ width: '100%', maxWidth: 400, padding: 16, position: 'relative', zIndex: 1 }}>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <img src="/logo.svg" alt="Logo" style={{ width: 48, height: 48, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>Esqueci minha senha</p>
              <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Enviaremos um link para redefinir sua senha</p>
            </div>
            {forgotMsg ? (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: '#052e16', borderLeft: '3px solid #22c55e', marginBottom: 16 }}>
                <p style={{ color: '#22c55e', fontSize: 13 }}>{forgotMsg}</p>
              </div>
            ) : (
              <form onSubmit={sendForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="email" placeholder="Seu e-mail" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                <button type="submit" className="btn" style={{ background: '#6366f1', color: '#fff', fontWeight: 600, padding: 12 }} disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            )}
            <button onClick={() => setMode('login')} style={{ width: '100%', marginTop: 12, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
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
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/logo.svg" alt="Logo" style={{ width: 56, height: 56, margin: '0 auto 8px' }} />
            <p style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>Gerenciador de Gastos</p>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Controle financeiro inteligente</p>
          </div>

          <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); setShowResend(false); }} style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: 6, fontWeight: 600, fontSize: 13,
                background: mode === m ? '#6366f1' : 'transparent',
                color: mode === m ? '#fff' : '#475569', transition: 'all 0.2s'
              }}>
                {m === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'register' && (
              <input name="name" placeholder="Seu nome" value={form.name} onChange={handle} required />
            )}
            <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handle} required />
            <input name="password" type="password" placeholder="Senha" value={form.password} onChange={handle} required />

            {/* Indicador de força da senha */}
            {pwStrength && (
              <div style={{ marginTop: -4 }}>
                <div style={{ height: 4, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pwStrength.width, background: pwStrength.color, transition: 'all 0.3s', borderRadius: 4 }} />
                </div>
                <p style={{ fontSize: 11, color: pwStrength.color, marginTop: 4 }}>
                  Força da senha: {pwStrength.label}
                  {pwStrength.label !== 'Forte' && ' — use maiúsculas, números e símbolos (!@#$%)'}
                </p>
              </div>
            )}

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: '#2d0a0a', borderLeft: '3px solid #ef4444' }}>
                <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
              </div>
            )}

            {showResend && (
              <button type="button" onClick={resendVerification} disabled={resendLoading}
                style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: 8, color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {resendLoading ? 'Enviando...' : '📧 Reenviar e-mail de verificação'}
              </button>
            )}

            {success && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: '#052e16', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#22c55e', fontSize: 13 }}>{success}</p>
              </div>
            )}

            <button type="submit" className="btn" style={{ background: '#6366f1', color: '#fff', fontWeight: 600, padding: '12px', marginTop: 4 }} disabled={loading}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} style={{ width: '100%', marginTop: 16, padding: '10px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: 8, color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🔑 Esqueci minha senha
            </button>
          )}
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
