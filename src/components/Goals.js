'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from './ConfirmModal';

const ICONS = ['🎯','🏠','🚗','✈️','📱','💻','🎓','💍','🏖️','💰'];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '', icon: '🎯' });

  const load = async () => {
    try { const { data } = await api.get('/goals'); setGoals(data); }
    catch (e) { console.error('Erro ao carregar metas:', e.message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/goals', form);
      setForm({ name: '', targetAmount: '', deadline: '', icon: '🎯' });
      setOpen(false); load();
    } catch (e) { alert('Erro ao criar meta. Tente novamente.'); }
  };

  const addProgress = async (id) => {
    const val = progress[id];
    if (!val || isNaN(val) || +val <= 0) return;
    try {
      await api.patch(`/goals/${id}`, { amount: +val });
      setProgress({ ...progress, [id]: '' });
      load();
    } catch (e) { console.error('Erro ao atualizar progresso:', e.message); }
  };

  const del = async () => {
    try { await api.delete(`/goals/${confirmId}`); load(); }
    catch (e) { console.error('Erro ao excluir meta:', e.message); }
    setConfirmId(null);
  };

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <ConfirmModal
        open={!!confirmId}
        title="Excluir meta?"
        message="Esta meta e todo o progresso serão removidos permanentemente."
        onConfirm={del}
        onCancel={() => setConfirmId(null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Metas Financeiras</p>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Defina objetivos e acompanhe seu progresso</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(!open)}>
          {open ? 'Cancelar' : '+ Nova Meta'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: '#0f172a', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input placeholder="Nome da meta" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input type="number" step="0.01" min="0.01" placeholder="Valor alvo (R$)" value={form.targetAmount} onChange={e => setForm({...form, targetAmount: e.target.value})} required />
            <input type="date" placeholder="Prazo (opcional)" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
            <select value={form.icon} onChange={e => setForm({...form, icon: e.target.value})}>
              {ICONS.map(ic => <option key={ic} value={ic}>{ic} {ic}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Criar Meta</button>
        </form>
      )}

      {goals.length === 0 && !open && (
        <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Nenhuma meta cadastrada</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {goals.map(g => {
          const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
          const done = pct >= 100;
          return (
            <div key={g.id} style={{ background: '#0f172a', borderRadius: 10, padding: 16, border: `1px solid ${done ? '#166534' : '#1e293b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{g.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{g.name}</p>
                    {g.deadline && <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Prazo: {g.deadline}</p>}
                  </div>
                </div>
                <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmId(g.id)}>✕</button>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(g.currentAmount)} de {fmt(g.targetAmount)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#22c55e' : '#6366f1' }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, width: `${pct}%`, background: done ? '#22c55e' : '#6366f1', transition: 'width 0.5s ease' }} />
                </div>
                {!done && <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Faltam {fmt(g.targetAmount - g.currentAmount)}</p>}
                {done && <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>✅ Meta atingida!</p>}
              </div>

              {!done && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" step="0.01" placeholder="Adicionar valor" value={progress[g.id] || ''}
                    onChange={e => setProgress({ ...progress, [g.id]: e.target.value })}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => addProgress(g.id)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
