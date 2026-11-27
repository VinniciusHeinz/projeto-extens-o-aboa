'use client';
import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, DEFAULT_EXPENSE_CATS } from './TransactionForm';

const STORAGE_LIMITS_KEY = 'aboa_budget_limits';

function InfoBadge({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '135%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #38bdf8',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 11,
          fontWeight: 400,
          width: 260,
          zIndex: 999,
          boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
          lineHeight: 1.4,
          pointerEvents: 'none',
          textAlign: 'left'
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

export default function BudgetLimits({ summary }) {
  const [categories, setCategories] = useState(DEFAULT_EXPENSE_CATS);
  const [limits, setLimits] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const syncData = useCallback(() => {
    try {
      const savedLimits = localStorage.getItem(STORAGE_LIMITS_KEY);
      if (savedLimits) setLimits(JSON.parse(savedLimits));

      const savedCats = localStorage.getItem(STORAGE_KEYS.expense);
      if (savedCats) setCategories(JSON.parse(savedCats));
      else localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(DEFAULT_EXPENSE_CATS));
    } catch (e) {
      console.error('Erro ao ler limites:', e);
    }
  }, []);

  useEffect(() => {
    syncData();
    window.addEventListener('aboa-categories-updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      window.removeEventListener('aboa-categories-updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, [syncData]);

  const handleLimitChange = (category, rawInput) => {
    const digits = rawInput.replace(/\D/g, '');
    if (!digits) {
      setDraft(prev => ({ ...prev, [category]: 0 }));
      return;
    }
    const numericVal = parseFloat(digits) / 100;
    setDraft(prev => ({ ...prev, [category]: numericVal }));
  };

  const save = () => {
    const cleaned = {};
    Object.entries(draft).forEach(([k, v]) => { 
      if (v && +v > 0) cleaned[k] = +v; 
    });
    setLimits(cleaned);
    localStorage.setItem(STORAGE_LIMITS_KEY, JSON.stringify(cleaned));
    localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(categories));
    window.dispatchEvent(new Event('aboa-categories-updated'));
    setEditing(false);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setNewCategoryName('');
      setIsAddingNew(false);
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(updated));
    window.dispatchEvent(new Event('aboa-categories-updated'));
    setNewCategoryName('');
    setIsAddingNew(false);
  };

  const handleDeleteCategory = (catToDelete) => {
    if (categories.length <= 1) {
      alert('É necessário manter pelo menos uma categoria cadastrada.');
      return;
    }
    const updated = categories.filter(c => c !== catToDelete);
    setCategories(updated);
    localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(updated));

    const updatedLimits = { ...limits };
    delete updatedLimits[catToDelete];
    setLimits(updatedLimits);
    localStorage.setItem(STORAGE_LIMITS_KEY, JSON.stringify(updatedLimits));

    const updatedDraft = { ...draft };
    delete updatedDraft[catToDelete];
    setDraft(updatedDraft);

    window.dispatchEvent(new Event('aboa-categories-updated'));
  };

  const byCategory = {};
  (summary?.byCategory || []).forEach(c => { 
    byCategory[c.category] = c.total; 
  });

  const hasLimits = Object.keys(limits).length > 0;
  const alerts = categories.filter(c => limits[c] && (byCategory[c] || 0) > limits[c]);

  const labelStyle = {
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1'
  };

  const inputStyle = {
    fontFamily: 'inherit',
    fontSize: 13,
    lineHeight: '1.4',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f8fafc',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
            🎯 Gastos por Categoria
            <InfoBadge text="Contabiliza apenas os valores efetivamente pagos no mês selecionado em relação ao limite planejado pela ONG. Parcelas futuras pendentes só entram no limite quando forem pagas." />
          </h2>
        </div>
        <button 
          type="button"
          className="btn" 
          onClick={() => { setDraft({...limits}); setEditing(!editing); }}
          style={{ fontFamily: 'inherit', background: editing ? '#334155' : '#0f172a', color: editing ? '#f8fafc' : '#cbd5e1', border: '1px solid #334155', fontSize: 12, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          {editing ? 'Cancelar' : '✏️ Configurar Limites'}
        </button>
      </div>

      {/* Alertas de limite ultrapassado */}
      {alerts.length > 0 && (
        <div style={{ background: '#2d0a0a', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>
            ⚠️ Limite ultrapassado:
          </p>
          {alerts.map(c => (
            <p key={c} style={{ fontSize: 12, color: '#fca5a5', margin: '2px 0' }}>
              • {c}: {fmt(byCategory[c])} gasto / limite de {fmt(limits[c])} (+{fmt(byCategory[c] - limits[c])} acima)
            </p>
          ))}
        </div>
      )}

      {editing ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Digite o limite mensal (R$) para cada categoria:
            </p>
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              style={{
                fontFamily: 'inherit',
                background: isAddingNew ? '#334155' : 'rgba(56, 189, 248, 0.14)',
                border: `1px solid ${isAddingNew ? '#475569' : 'rgba(56, 189, 248, 0.5)'}`,
                color: isAddingNew ? '#e2e8f0' : '#38bdf8',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAddingNew ? 'Cancelar' : '+ Nova Categoria'}
            </button>
          </div>

          {isAddingNew && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #38bdf8' }}>
              <input
                placeholder="Nome da nova categoria"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                style={{ fontFamily: 'inherit', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Adicionar
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
            {categories.map(c => {
              const val = draft[c] || 0;
              const formattedVal = val > 0 ? fmt(val) : '';
              return (
                <div key={c} style={{ background: '#0f172a', padding: 12, borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <label style={labelStyle}>{c}</label>
                    <button
                      type="button"
                      title="Excluir categoria"
                      onClick={() => handleDeleteCategory(c)}
                      style={{ background: '#2d0a0a', border: '1px solid #991b1b', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '3px 6px', flexShrink: 0 }}
                    >
                      🗑️
                    </button>
                  </div>
                  <input 
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00 (Sem limite)"
                    value={formattedVal}
                    onChange={e => handleLimitChange(c, e.target.value)}
                    style={{ ...inputStyle, fontWeight: formattedVal ? 600 : 400 }}
                  />
                </div>
              );
            })}
          </div>

          <button 
            type="button"
            className="btn btn-primary" 
            onClick={save} 
            style={{ fontFamily: 'inherit', width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            Salvar Limites
          </button>
        </div>
      ) : hasLimits ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.filter(c => limits[c]).map(c => {
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
                  <span style={{ color, fontWeight: 700 }}>{fmt(spent)} / {fmt(limit)}</span>
                </div>
                <div style={{ height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '14px 0', margin: 0 }}>
          Nenhum limite configurado. Clique em &quot;Configurar Limites&quot; para definir tetos mensais.
        </p>
      )}
    </div>
  );
}