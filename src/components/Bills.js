'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from './ConfirmModal';

const DEFAULT_CATEGORIES = [
  'Despesas Operacionais (Água / Luz / Internet)',
  'Aluguel da Sede / Manutenção',
  'Serviços Contábeis / Jurídicos',
  'Alimentação / Cestas Básicas',
  'Material de Consumo / Escritório',
  'Serviços de Terceiros (PF / PJ)',
  'Despesas da Emenda Governamental',
  'Outros'
];

export default function Bills({ onUpdate }) {
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [open, setOpen] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payValueFormatted, setPayValueFormatted] = useState('');
  const [payValueRaw, setPayValueRaw] = useState(0);
  const [confirmId, setConfirmId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    rawTotalAmount: 0,
    totalAmountFormatted: '',
    installments: '1',
    startDate: new Date().toISOString().split('T')[0],
    category: DEFAULT_CATEGORIES[0]
  });

  const load = async () => {
    try {
      const { data } = await api.get('/bills');
      setBills(data);
    } catch (e) {
      console.error('Erro ao carregar contas a pagar:', e.message);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Máscara de moeda para o valor total
  const handleAmountChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setForm(prev => ({ ...prev, rawTotalAmount: 0, totalAmountFormatted: '' }));
      return;
    }
    const numberValue = parseFloat(rawDigits) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    setForm(prev => ({ ...prev, rawTotalAmount: numberValue, totalAmountFormatted: formatted }));
  };

  // Máscara de moeda para o valor de pagamento avulso
  const handlePayValueChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setPayValueRaw(0);
      setPayValueFormatted('');
      return;
    }
    const numberValue = parseFloat(rawDigits) / 100;
    setPayValueRaw(numberValue);
    setPayValueFormatted(numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }));
  };

  const handleCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories(prev => [trimmed, ...prev]);
    setForm(prev => ({ ...prev, category: trimmed }));
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.rawTotalAmount || form.rawTotalAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    try {
      await api.post('/bills', {
        name: form.name,
        totalAmount: form.rawTotalAmount,
        installments: form.installments,
        startDate: form.startDate,
        category: form.category
      });

      setForm({
        name: '',
        rawTotalAmount: 0,
        totalAmountFormatted: '',
        installments: '1',
        startDate: new Date().toISOString().split('T')[0],
        category: categories[0]
      });
      setOpen(false);
      load();
      onUpdate();
    } catch (e) {
      alert('Erro ao salvar conta a pagar. Verifique a conexão com o banco.');
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
    const initialVal = bill.installmentAmount || bill.totalAmount || 0;
    setPayValueRaw(initialVal);
    setPayValueFormatted(initialVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const confirmPay = async (bill) => {
    const id = bill._id || bill.id;
    if (payValueRaw <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    try {
      await api.patch(`/bills/${id}`, { paidAmount: payValueRaw });
      setPayingId(null);
      setPayValueRaw(0);
      setPayValueFormatted('');
      load();
      onUpdate();
    } catch (e) {
      alert('Erro ao registrar baixa de pagamento.');
    }
  };

  const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const parcelas = parseInt(form.installments) || 1;
  const valorParcela = form.rawTotalAmount > 0 ? (form.rawTotalAmount / parcelas) : 0;

  return (
    <div className="card" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      <ConfirmModal
        open={!!confirmId}
        title="Excluir conta a pagar?"
        message="Esta conta e o histórico de parcelas serão removidos permanentemente."
        onConfirm={del}
        onCancel={() => setConfirmId(null)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, color: '#f8fafc', fontWeight: 700, margin: 0 }}>
            🧾 Contas a Pagar & Compromissos Fixos da ABOA
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Controle de boletos, encargos, notas a vencer e parcelamentos da entidade
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(!open)}
          style={{ background: open ? '#334155' : '#38bdf8', color: open ? '#fff' : '#0f172a', fontWeight: 700, borderRadius: 8, border: 'none', padding: '8px 16px', cursor: 'pointer' }}
        >
          {open ? 'Cancelar' : '+ Nova Conta'}
        </button>
      </div>

      {/* Formulário de Cadastro */}
      {open && (
        <form onSubmit={submit} style={{ background: '#0f172a', borderRadius: 10, padding: 18, marginBottom: 18, border: '1px solid #334155' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Nome da Conta / Credor *</label>
              <input 
                name="name" 
                placeholder="Ex: Aluguel da Sede / Sabesp" 
                value={form.name} 
                onChange={handle} 
                required 
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Valor Total (R$) *</label>
              <input 
                name="totalAmountFormatted" 
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00" 
                value={form.totalAmountFormatted} 
                onChange={handleAmountChange} 
                required 
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Nº de Parcelas *</label>
              <input 
                name="installments" 
                type="number" 
                min="1" 
                max="60" 
                placeholder="1" 
                value={form.installments} 
                onChange={handle} 
                required 
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff' }}
              />
              {parcelas > 1 && (
                <p style={{ color: '#38bdf8', fontSize: 11, margin: '2px 0 0 0' }}>
                  {parcelas}x de {fmt(valorParcela)}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>1º Vencimento *</label>
              <input 
                name="startDate" 
                type="date" 
                value={form.startDate} 
                onChange={handle} 
                required 
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Rubrica / Categoria *</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0 }}
                >
                  {isAddingCategory ? 'Cancelar' : '+ Nova'}
                </button>
              </div>

              {isAddingCategory ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Nome da categoria"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    style={{ flex: 1, background: '#1e293b', border: '1px solid #38bdf8', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 6, padding: '0 10px', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <select 
                  name="category" 
                  value={form.category} 
                  onChange={handle}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', color: '#fff' }}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}
          >
            {parcelas > 1 ? `Salvar Compromisso (${parcelas} parcelas)` : 'Salvar Conta a Pagar'}
          </button>
        </form>
      )}

      {bills.length === 0 && !open && (
        <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>
          Nenhum compromisso ou conta cadastrada no momento.
        </p>
      )}

      {/* Lista de Contas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bills.map(b => {
          const id = b._id || b.id;
          const paid = b.paidInstallments || 0;
          const total = b.installments || 1;
          const paidAmount = paid * (b.installmentAmount || b.totalAmount);
          const remaining = b.totalAmount - paidAmount;
          const progress = Math.min((paid / total) * 100, 100);
          const isDone = paid >= total;

          return (
            <div key={id} style={{ background: '#0f172a', borderRadius: 8, padding: '14px 16px', border: '1px solid #334155', opacity: isDone ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{b.name}</p>
                    {isDone && <span style={{ fontSize: 11, background: '#16a34a', color: '#fff', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>✓ Quitada</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', background: '#1e293b', padding: '3px 8px', borderRadius: 4 }}>{b.category}</span>
                    {total > 1 && (
                      <span style={{ fontSize: 11, color: '#38bdf8', background: '#082f49', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                        {total}x de {fmt(b.installmentAmount)}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>Vencimento inicial: {b.startDate}</span>
                  </div>

                  {/* Barra de progresso */}
                  {total > 1 && (
                    <div style={{ marginBottom: 6, maxWidth: 360 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                        <span>{paid} de {total} parcelas pagas</span>
                        <span style={{ color: isDone ? '#22c55e' : '#fbbf24', fontWeight: 600 }}>
                          {isDone ? 'Concluído' : `Restam ${fmt(remaining)}`}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: isDone ? '#22c55e' : '#38bdf8', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Box de baixa de pagamento */}
                  {payingId === id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={payValueFormatted}
                        onChange={handlePayValueChange}
                        placeholder="R$ 0,00"
                        style={{ width: 140, fontSize: 13, padding: '7px 10px', background: '#1e293b', border: '1px solid #38bdf8', color: '#fff', borderRadius: 6, fontWeight: 600 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '7px 14px', fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => confirmPay(b)}
                      >
                        ✓ Confirmar Baixa
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '7px 10px', fontSize: 12, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => setPayingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="expense" style={{ fontWeight: 700, fontSize: 15, margin: 0, color: '#ef4444' }}>{fmt(b.totalAmount)}</p>
                    {total > 1 && <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>total pactuado</p>}
                  </div>
                  {!isDone && (
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: 12, background: '#16a34a', color: '#fff', borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => payingId === id ? setPayingId(null) : openPay(b)}
                    >
                      💳 Pagar Parcela
                    </button>
                  )}
                  <button 
                    type="button"
                    className="btn btn-danger" 
                    style={{ padding: '6px 10px', fontSize: 12, background: '#2d0a0a', border: '1px solid #991b1b', color: '#ef4444', borderRadius: 6, cursor: 'pointer' }} 
                    onClick={() => setConfirmId(id)}
                    title="Excluir conta"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}