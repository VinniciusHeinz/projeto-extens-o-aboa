'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from './ConfirmModal';

const CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'];

export default function Bills({ onUpdate }) {
  const [bills, setBills] = useState([]);
  const [open, setOpen] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payValue, setPayValue] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState({
    name: '', totalAmount: '', installments: '1',
    startDate: new Date().toISOString().split('T')[0], category: 'Moradia'
  });

  const load = async () => {
    try {
      const { data } = await api.get('/bills');
      setBills(data);
    } catch (e) {
      console.error('Erro ao carregar contas:', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/bills', form);
      setForm({ name: '', totalAmount: '', installments: '1', startDate: new Date().toISOString().split('T')[0], category: 'Moradia' });
      setOpen(false);
      load();
      onUpdate();
    } catch (e) {
      alert('Erro ao salvar conta. Tente novamente.');
    }
  };

  const del = async () => {
    try {
      await api.delete(`/bills/${confirmId}`);
      load();
      onUpdate();
    } catch (e) {
      console.error('Erro ao excluir conta:', e.message);
    }
    setConfirmId(null);
  };

  const openPay = (bill) => {
    setPayingId(bill._id || bill.id);
    setPayValue(bill.installmentAmount?.toFixed(2) || bill.totalAmount?.toFixed(2) || '');
  };

  const confirmPay = async (bill) => {
    const id = bill._id || bill.id;
    try {
      await api.patch(`/bills/${id}`, { paidAmount: parseFloat(payValue) });
      setPayingId(null);
      setPayValue('');
      load();
      onUpdate();
    } catch (e) {
      alert('Erro ao registrar pagamento.');
    }
  };

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const parcelas = parseInt(form.installments) || 1;
  const valorParcela = form.totalAmount ? (parseFloat(form.totalAmount) / parcelas).toFixed(2) : '0.00';

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <ConfirmModal
        open={!!confirmId}
        title="Excluir conta?"
        message="Esta conta e todas as parcelas serão removidas permanentemente."
        onConfirm={del}
        onCancel={() => setConfirmId(null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, color: '#94a3b8' }}>🧾 Contas</h2>
        <button className="btn btn-primary" onClick={() => setOpen(!open)}>
          {open ? 'Cancelar' : '+ Nova Conta'}
        </button>
      </div>

      {/* Formulário */}
      {open && (
        <form onSubmit={submit} style={{ background: '#0f172a', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input name="name" placeholder="Nome da conta" value={form.name} onChange={handle} required />
            <input name="totalAmount" type="number" step="0.01" min="0.01" placeholder="Valor total (R$)" value={form.totalAmount} onChange={handle} required />
            <div>
              <input name="installments" type="number" min="1" max="60" placeholder="Nº de parcelas" value={form.installments} onChange={handle} required />
              {parcelas > 1 && (
                <p style={{ color: '#6366f1', fontSize: 12, marginTop: 4 }}>
                  {parcelas}x de {fmt(parseFloat(valorParcela))}
                </p>
              )}
            </div>
            <input name="startDate" type="date" value={form.startDate} onChange={handle} required />
            <select name="category" value={form.category} onChange={handle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {parcelas > 1 ? `Adicionar ${parcelas} parcelas automaticamente` : 'Adicionar Conta'}
          </button>
        </form>
      )}

      {bills.length === 0 && !open && (
        <p style={{ color: '#475569', textAlign: 'center', padding: 20 }}>Nenhuma conta cadastrada</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bills.map(b => {
          const id = b._id || b.id;
          const paid = b.paidInstallments || 0;
          const total = b.installments || 1;
          const paidAmount = paid * (b.installmentAmount || b.totalAmount);
          const remaining = b.totalAmount - paidAmount;
          const progress = Math.min((paid / total) * 100, 100);
          const isDone = paid >= total;

          return (
            <div key={id} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', opacity: isDone ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                    {isDone && <span style={{ fontSize: 11, background: '#16a34a', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>✓ Quitada</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#475569', background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>{b.category}</span>
                    {total > 1 && (
                      <span style={{ fontSize: 12, color: '#6366f1', background: '#1e1b4b', padding: '2px 8px', borderRadius: 4 }}>
                        {total}x de {fmt(b.installmentAmount)}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>desde {b.startDate}</span>
                  </div>

                  {/* Barra de progresso */}
                  {total > 1 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 3 }}>
                        <span>{paid}/{total} parcelas pagas</span>
                        <span style={{ color: isDone ? '#22c55e' : '#fbbf24' }}>
                          {isDone ? 'Quitado' : `Restam ${fmt(remaining)}`}
                        </span>
                      </div>
                      <div style={{ height: 5, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: isDone ? '#22c55e' : '#6366f1', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Input de pagamento */}
                  {payingId === id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payValue}
                        onChange={e => setPayValue(e.target.value)}
                        placeholder="Valor pago (R$)"
                        style={{ width: 150, fontSize: 13, padding: '6px 10px' }}
                        autoFocus
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={() => confirmPay(b)}
                      >
                        ✓ Confirmar
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '6px 10px', fontSize: 12, background: '#1e293b', color: '#94a3b8' }}
                        onClick={() => setPayingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="expense" style={{ fontWeight: 700 }}>{fmt(b.totalAmount)}</p>
                    {total > 1 && <p style={{ fontSize: 11, color: '#475569' }}>total</p>}
                  </div>
                  {!isDone && (
                    <button
                      className="btn"
                      style={{ padding: '4px 10px', fontSize: 12, background: '#16a34a', color: '#fff', whiteSpace: 'nowrap' }}
                      onClick={() => payingId === id ? setPayingId(null) : openPay(b)}
                    >
                      💳 Pagar
                    </button>
                  )}
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmId(id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
