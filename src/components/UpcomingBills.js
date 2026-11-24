'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function UpcomingBills() {
  const [upcoming, setUpcoming] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bills/upcoming')
      .then(r => setUpcoming(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const getDaysLabel = (date) => {
    if (date === todayStr) return { label: 'HOJE', color: '#ef4444', bg: '#2d0a0a' };
    const diff = Math.round((new Date(date + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000);
    if (diff === 1) return { label: 'AMANHÃ', color: '#f59e0b', bg: '#1c1400' };
    return { label: `${diff} dias`, color: '#94a3b8', bg: '#0f172a' };
  };

  const total = upcoming.reduce((s, t) => s + (t.amount || 0), 0);
  const urgent = upcoming.filter(t => t.date <= todayStr || getDaysLabel(t.date).label === 'AMANHÃ').length;

  return (
    <>
      {/* Botão sino no header — exportado via data attribute para o page.js usar */}
      <button
        id="upcoming-bills-btn"
        onClick={() => setOpen(true)}
        style={{
          position: 'relative', background: urgent > 0 ? '#1c1400' : '#1e293b',
          border: `1px solid ${urgent > 0 ? '#92400e' : '#334155'}`,
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, color: urgent > 0 ? '#f59e0b' : '#94a3b8',
          fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
        }}
      >
        🔔
        {upcoming.length > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: urgent > 0 ? '#ef4444' : '#6366f1',
            color: '#fff', fontSize: 10, fontWeight: 700,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0f172a',
          }}>
            {upcoming.length}
          </span>
        )}
        <span className="hide-mobile">Alertas</span>
      </button>

      {/* Drawer lateral */}
      {open && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />

          {/* Painel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 999,
            width: '100%', maxWidth: 380,
            background: '#1e293b', borderLeft: '1px solid #334155',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn .2s ease',
          }}>
            {/* Header do painel */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>🔔 Alertas de Vencimento</p>
                <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Próximos 7 dias</p>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Resumo */}
            {upcoming.length > 0 && (
              <div style={{ margin: '14px 16px 0', padding: '12px 14px', background: '#0f172a', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Total a vencer</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{fmt(total)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Parcelas</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{upcoming.length}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Urgentes</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: urgent > 0 ? '#ef4444' : '#22c55e' }}>{urgent}</p>
                </div>
              </div>
            )}

            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading && <p style={{ color: '#475569', textAlign: 'center', padding: 20 }}>Carregando...</p>}

              {!loading && upcoming.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 6 }}>Tudo em dia!</p>
                  <p style={{ fontSize: 13, color: '#475569' }}>Nenhuma parcela vence nos próximos 7 dias.</p>
                </div>
              )}

              {upcoming.map((t, i) => {
                const { label, color, bg } = getDaysLabel(t.date);
                return (
                  <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '12px 14px', border: `1px solid ${color}22` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{t.description}</p>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {fmt(t.amount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569' }}>{t.date}</span>
                      {t.category && (
                        <span style={{ fontSize: 11, color: '#64748b', background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>
                          {t.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <style>{`
            @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
            .hide-mobile { display: inline; }
            @media (max-width: 640px) { .hide-mobile { display: none; } }
          `}</style>
        </>
      )}
    </>
  );
}
