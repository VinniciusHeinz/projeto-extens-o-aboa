'use client';
import { useState } from 'react';
import api from '../lib/api';

const statusConfig = {
  positivo: { color: '#22c55e', bg: '#052e16', border: '#166534', label: 'Situação Financeira Saudável' },
  atencao:  { color: '#f59e0b', bg: '#1c1400', border: '#92400e', label: 'Requer Atenção' },
  critico:  { color: '#ef4444', bg: '#2d0a0a', border: '#991b1b', label: 'Situação Crítica' },
};

export default function AITips() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_key') || '');
  const [result, setResult] = useState(() => {
    try {
      const cached = localStorage.getItem('ai_result');
      const cachedAt = localStorage.getItem('ai_result_at');
      if (cached && cachedAt && Date.now() - +cachedAt < 60 * 60 * 1000) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    let secs = 60;
    setCooldown(secs);
    const t = setInterval(() => {
      secs--;
      setCooldown(secs);
      if (secs <= 0) clearInterval(t);
    }, 1000);
  };

  const analyze = async () => {
    if (!apiKey) return setError('Insira sua chave Gemini');
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('gemini_key', apiKey);
      const { data } = await api.post('/ai/tips', { apiKey });
      setResult(data);
      localStorage.setItem('ai_result', JSON.stringify(data));
      localStorage.setItem('ai_result_at', Date.now().toString());
      startCooldown();
    } catch (e) {
      setError(e.response?.data?.error || 'Não foi possível conectar à IA. Verifique sua chave e tente novamente.');
      startCooldown();
    } finally {
      setLoading(false);
    }
  };

  const status = result ? (statusConfig[result.status] || statusConfig.atencao) : null;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Consultoria Financeira com IA</p>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Análise personalizada dos seus dados financeiros com recomendações práticas geradas por inteligência artificial.
        </p>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <input
          type="password"
          placeholder="Insira sua chave Gemini API"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
        />
        <button
          className="btn btn-ai"
          style={{ width: 'auto', whiteSpace: 'nowrap', minWidth: 120, opacity: cooldown > 0 ? 0.6 : 1 }}
          onClick={analyze}
          disabled={loading || cooldown > 0}
        >
          {loading ? '⏳ Analisando...' : cooldown > 0 ? `⏱ ${cooldown}s` : '🔍 Analisar'}
        </button>
      </div>

      {result && (
        <p style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
          ✓ Resultado em cache — nova análise disponível {cooldown > 0 ? `em ${cooldown}s` : 'agora'}
        </p>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#2d0a0a', borderLeft: '3px solid #ef4444', marginBottom: 12 }}>
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status + Diagnóstico */}
          <div style={{ padding: '16px', borderRadius: 10, background: status.bg, border: `1px solid ${status.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, display: 'inline-block' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: status.color }}>{status.label}</p>
            </div>
            <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>{result.diagnostico}</p>
          </div>

          {/* Alerta */}
          {result.alerta && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#1c1400', borderLeft: '3px solid #f59e0b', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <p style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.6 }}>{result.alerta}</p>
            </div>
          )}

          {/* Dicas */}
          {result.dicas && result.dicas.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>Recomendações</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {result.dicas.map((dica, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{dica.icone}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{dica.titulo}</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{dica.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
