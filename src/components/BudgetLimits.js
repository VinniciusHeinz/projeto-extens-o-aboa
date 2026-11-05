'use client';
import { useState, useEffect } from 'react';

const CATEGORIES = ['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Outros'];
const STORAGE_KEY = 'budget_limits';

export default function BudgetLimits({ summary }) {
  const [limits, setLimits] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLimits(JSON.parse(saved));
    } catch {}
  }, []);

  const save = () => {
    const cleaned = {};
    Object.entries(draft).forEach(([k, v]) => { if (v && +v > 0) cleaned[k] = +v; });
    setLimits(cleaned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    setEditing(false);
  };

  const byCategory = {};
  (summary?.byCategory || []).forEach(c => { byCategory[c.category] = c.total; });

  // Categorias: fixas + as que existem nas transações do mês
  const txCategories = (summary?.byCategory || []).map(c => c.category);
  const allCategories = [...new Set([...CATEGORIES, ...txCategories])];

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const hasLimits = Object.keys(limits).length > 0;
  const alerts = allCategories.filter(c => limits[c] && (byCategory[c] || 0) > limits[c]);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>🎯 Limites por Categoria</p>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Defina tetos de gasto mensais por categoria</p>
        </div>
        <button className="btn" onClick={() => { setDraft({...limits}); setEditing(!editing); }}
          style={{ background: editing ? '#334155' : '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontSize: 12 }}>
          {editing ? 'Cancelar' : '✏️ Editar'}
        </button>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div style={{ background: '#2d0a0a', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>⚠️ Limite ultrapassado em:</p>
          {alerts.map(c => (
            <p key={c} style={{ fontSize: 12, color: '#fca5a5' }}>
              • {c}: {fmt(byCategory[c])} / limite {fmt(limits[c])} (+{fmt(byCategory[c] - limits[c])})
            </p>
          ))}
        </div>
      )}

      {editing ? (
        <div>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
            ⚠️ O limite é comparado com a <strong style={{ color: '#64748b' }}>categoria</strong> da transação, não com a descrição.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
            {allCategories.map(c => (
              <div key={c}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{c}</label>
                <input type="number" min="0" step="0.01" placeholder="Sem limite"
                  value={draft[c] || ''}
                  onChange={e => setDraft({ ...draft, [c]: e.target.value })}
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}>Salvar Limites</button>
        </div>
      ) : hasLimits ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allCategories.filter(c => limits[c]).map(c => {
            const spent = byCategory[c] || 0;
            const limit = limits[c];
            const pct = Math.min((spent / limit) * 100, 100);
            const over = spent > limit;
            const warn = pct >= 80;
            const color = over ? '#ef4444' : warn ? '#f59e0b' : '#22c55e';
            return (
              <div key={c}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#94a3b8' }}>{c}</span>
                  <span style={{ color, fontWeight: 600 }}>{fmt(spent)} / {fmt(limit)}</span>
                </div>
                <div style={{ height: 6, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          Nenhum limite definido. Clique em "Editar" para configurar.
        </p>
      )}
    </div>
  );
}
