'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import ConfirmModal from './ConfirmModal';
import { STORAGE_KEYS, DEFAULT_EXPENSE_CATS } from './TransactionForm';

function InfoBadge({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, cursor: 'help' }}
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
          width: 235,
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

export default function Bills({ onUpdate }) {
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_EXPENSE_CATS);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [open, setOpen] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payValueFormatted, setPayValueFormatted] = useState('');
  const [payValueRaw, setPayValueRaw] = useState(0);
  const [payError, setPayError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    rawTotalAmount: 0,
    totalAmountFormatted: '',
    installments: '1',
    startDate: new Date().toISOString().split('T')[0],
    category: DEFAULT_EXPENSE_CATS[0]
  });

  const syncCategories = useCallback(() => {
    try {
      const savedExp = localStorage.getItem(STORAGE_KEYS.expense);
      const nextCats = savedExp ? JSON.parse(savedExp) : DEFAULT_EXPENSE_CATS;
      if (!savedExp) {
        localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(DEFAULT_EXPENSE_CATS));
      }
      setCategories(nextCats);
      setForm(prev => {
        if (nextCats.length > 0 && !nextCats.includes(prev.category)) {
          return { ...prev, category: nextCats[0] };
        }
        return prev;
      });
    } catch (e) {
      console.error('Erro ao sincronizar categorias em Contas a Pagar:', e);
    }
  }, []);

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
    syncCategories();
    window.addEventListener('aboa-categories-updated', syncCategories);
    window.addEventListener('storage', syncCategories);
    return () => {
      window.removeEventListener('aboa-categories-updated', syncCategories);
      window.removeEventListener('storage', syncCategories);
    };
  }, [syncCategories]);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

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

  const handlePayValueChange = (e) => {
    setPayError('');
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
    if (!trimmed) return;
    const updated = categories.includes(trimmed) ? categories : [...categories, trimmed];
    setCategories(updated);
    localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(updated));
    window.dispatchEvent(new Event('aboa-categories-updated'));
    setForm(prev => ({ ...prev, category: trimmed }));
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleDeleteCurrentCategory = () => {
    const target = form.category;
    if (!target) return;
    if (categories.length <= 1) {
      alert('É necessário manter pelo menos uma categoria cadastrada.');
      return;
    }
    if (!confirm(`Deseja excluir a categoria "${target}" de todos os campos do sistema?`)) return;

    const updated = categories.filter(c => c !== target);
    setCategories(updated);
    localStorage.setItem(STORAGE_KEYS.expense, JSON.stringify(updated));
    window.dispatchEvent(new Event('aboa-categories-updated'));
    setForm(prev => ({ ...prev, category: updated[0] }));
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
        category: categories[0] || DEFAULT_EXPENSE_CATS[0]
      });
      setOpen(false);
      load();
      onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar conta a pagar. Verifique a conexão com o banco.');
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
    setPayError('');
    // Se a parcela atual foi paga parcialmente, sugere exatamente o que falta para quitá-la
    const suggestedVal =
      bill.currentInstallmentRemaining > 0
        ? bill.currentInstallmentRemaining
        : bill.remainingAmount > 0
        ? Math.min(bill.remainingAmount, bill.installmentAmount || bill.totalAmount)
        : 0;

    setPayValueRaw(suggestedVal);
    setPayValueFormatted(suggestedVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const confirmPay = async (bill, overrideAmount = null) => {
    const id = bill._id || bill.id;
    const valueToPay = overrideAmount !== null ? overrideAmount : payValueRaw;
    const maxAllowed =
      bill.remainingAmount !== undefined
        ? bill.remainingAmount
        : Math.max(0, bill.totalAmount - (bill.totalPaidAmount || 0));

    if (valueToPay <= 0) {
      setPayError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (valueToPay > maxAllowed + 0.009) {
      setPayError(`O valor máximo permitido para quitar esta conta é ${fmt(maxAllowed)}.`);
      return;
    }

    try {
      await api.patch(`/bills/${id}`, { paidAmount: valueToPay });
      setPayingId(null);
      setPayValueRaw(0);
      setPayValueFormatted('');
      setPayError('');
      load();
      onUpdate();
    } catch (e) {
      setPayError(e.response?.data?.error || 'Erro ao registrar baixa de pagamento.');
    }
  };

  const fmt = v => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const parcelas = parseInt(form.installments) || 1;
  const valorParcela = form.rawTotalAmount > 0 ? (form.rawTotalAmount / parcelas) : 0;

  const labelStyle = {
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center'
  };

  const inputStyle = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 400,
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
      <ConfirmModal
        open={!!confirmId}
        title="Excluir conta a pagar?"
        message="Esta conta e todas as parcelas vinculadas no Livro Caixa serão removidas."
        onConfirm={del}
        onCancel={() => setConfirmId(null)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, color: '#f8fafc', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center' }}>
            🧾 Contas a Pagar & Compromissos Fixos da ABOA
            <InfoBadge text="Cadastre aqui contas fixas ou compras parceladas. Você pode registrar pagamentos parciais de uma parcela ou quitar todo o saldo antecipadamente." />
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Controle de boletos, encargos, notas a vencer e parcelamentos da entidade
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(!open)}
          style={{ fontFamily: 'inherit', background: open ? '#334155' : '#38bdf8', color: open ? '#fff' : '#0f172a', fontWeight: 700, borderRadius: 8, border: 'none', padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
        >
          {open ? 'Cancelar' : '+ Nova Conta'}
        </button>
      </div>

      {/* Formulário de Cadastro */}
      {open && (
        <form onSubmit={submit} style={{ background: '#0f172a', borderRadius: 10, padding: 18, marginBottom: 18, border: '1px solid #334155' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Nome da Conta *
                <InfoBadge text="Identificação do compromisso ou fornecedor. Exemplo: Aluguel da Sede, Sabesp, Compra de Equipamentos." />
              </label>
              <input 
                name="name" 
                placeholder="Ex: Aluguel da Sede" 
                value={form.name} 
                onChange={handle} 
                required 
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Valor Total (R$) *
                <InfoBadge text="Valor total somando todas as parcelas do compromisso." />
              </label>
              <input 
                name="totalAmountFormatted" 
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00" 
                value={form.totalAmountFormatted} 
                onChange={handleAmountChange} 
                required 
                style={{ ...inputStyle, fontWeight: form.totalAmountFormatted ? 600 : 400 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Nº de Parcelas *
                <InfoBadge text="Quantidade de meses em que o valor será dividido (1 para conta única ou até 60 parcelas)." />
              </label>
              <input 
                name="installments" 
                type="number" 
                min="1" 
                max="60" 
                placeholder="1" 
                value={form.installments} 
                onChange={handle} 
                required 
                style={inputStyle}
              />
              {parcelas > 1 && (
                <p style={{ color: '#38bdf8', fontSize: 11, margin: '2px 0 0 0' }}>
                  {parcelas}x de {fmt(valorParcela)}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                1º Vencimento *
                <InfoBadge text="Data de vencimento da primeira parcela. As seguintes serão lançadas nos meses subsequentes." />
              </label>
              <input 
                name="startDate" 
                type="date" 
                value={form.startDate} 
                onChange={handle} 
                required 
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <label style={labelStyle}>
                  Categoria *
                  <InfoBadge text="Categoria contábil da despesa. Sincronizada automaticamente com Registrar Movimentação e Gastos por Categoria." />
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  style={{
                    fontFamily: 'inherit',
                    background: isAddingCategory ? '#334155' : 'rgba(56, 189, 248, 0.14)',
                    border: `1px solid ${isAddingCategory ? '#475569' : 'rgba(56, 189, 248, 0.5)'}`,
                    color: isAddingCategory ? '#e2e8f0' : '#38bdf8',
                    borderRadius: 6,
                    padding: '3px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAddingCategory ? 'Cancelar' : '+ Nova Categoria'}
                </button>
              </div>

              {isAddingCategory ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Nome da nova categoria"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    style={{ ...inputStyle, borderColor: '#38bdf8', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    style={{ fontFamily: 'inherit', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select 
                    name="category" 
                    value={form.category} 
                    onChange={handle}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrentCategory}
                      title="Excluir categoria selecionada"
                      style={{
                        background: '#2d0a0a',
                        border: '1px solid #991b1b',
                        color: '#ef4444',
                        borderRadius: 8,
                        padding: '10px 11px',
                        cursor: 'pointer',
                        fontSize: 12,
                        flexShrink: 0
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ fontFamily: 'inherit', width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
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
          const total = b.installments || 1;
          const totalPaid =
            b.totalPaidAmount !== undefined
              ? Number(b.totalPaidAmount)
              : (b.paidInstallments || 0) * (b.installmentAmount || b.totalAmount);
          const remaining =
            b.remainingAmount !== undefined
              ? Number(b.remainingAmount)
              : Math.max(0, b.totalAmount - totalPaid);
          const paidCount = b.paidInstallments || 0;
          const progress = Math.min((totalPaid / (b.totalAmount || 1)) * 100, 100);
          const isDone = remaining <= 0.009 || paidCount >= total;
          const hasPartialCurrent = !isDone && (b.currentInstallmentPaid || 0) > 0;

          return (
            <div key={id} style={{ background: '#0f172a', borderRadius: 8, padding: '14px 16px', border: '1px solid #334155', opacity: isDone ? 0.78 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{b.name}</p>
                    {isDone && (
                      <span style={{ fontSize: 11, background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        ✓ Quitada
                      </span>
                    )}
                    {hasPartialCurrent && (
                      <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        ⏳ Parcela {b.currentInstallmentNumber}/{total} Parcialmente Paga
                      </span>
                    )}
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

                  {/* Detalhe de pagamento parcial da parcela atual */}
                  {hasPartialCurrent && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#fde68a', maxWidth: 430 }}>
                      Parcela {b.currentInstallmentNumber}/{total}: <strong>{fmt(b.currentInstallmentPaid)}</strong> pagos • Faltam <strong>{fmt(b.currentInstallmentRemaining)}</strong> para quitar esta parcela (Total: {fmt(b.currentInstallmentTotal)}).
                    </div>
                  )}

                  {/* Barra de progresso financeira */}
                  <div style={{ marginBottom: 6, maxWidth: 430 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4, gap: 8 }}>
                      <span>
                        {total > 1
                          ? `${paidCount} de ${total} parcelas quitadas (${fmt(totalPaid)} pagos)`
                          : `${fmt(totalPaid)} pagos`}
                      </span>
                      <span style={{ color: isDone ? '#22c55e' : '#fbbf24', fontWeight: 600 }}>
                        {isDone ? '100% Concluído' : `Restam ${fmt(remaining)}`}
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: isDone ? '#22c55e' : '#38bdf8', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Box de baixa de pagamento */}
                  {payingId === id && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={payValueFormatted}
                          onChange={handlePayValueChange}
                          placeholder="R$ 0,00"
                          style={{ ...inputStyle, width: 145, borderColor: '#38bdf8', fontWeight: 600 }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontFamily: 'inherit', padding: '9px 14px', fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => confirmPay(b)}
                        >
                          ✓ Confirmar Baixa
                        </button>
                        {remaining > 0 && (
                          <button
                            type="button"
                            className="btn"
                            style={{ fontFamily: 'inherit', padding: '9px 12px', fontSize: 12, background: 'rgba(56, 189, 248, 0.14)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => confirmPay(b, remaining)}
                          >
                            ⚡ Quitar Saldo Total ({fmt(remaining)})
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn"
                          style={{ fontFamily: 'inherit', padding: '9px 12px', fontSize: 12, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}
                          onClick={() => { setPayingId(null); setPayError(''); }}
                        >
                          Cancelar
                        </button>
                      </div>
                      {payError && (
                        <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, margin: '6px 0 0 0' }}>
                          ⚠️ {payError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="expense" style={{ fontWeight: 700, fontSize: 15, margin: 0, color: isDone ? '#22c55e' : '#ef4444' }}>
                      {fmt(b.totalAmount)}
                    </p>
                    <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
                      {isDone ? 'total quitado' : 'total pactuado'}
                    </p>
                  </div>
                  {!isDone && (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontFamily: 'inherit', padding: '7px 12px', fontSize: 12, background: '#16a34a', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => payingId === id ? setPayingId(null) : openPay(b)}
                    >
                      💳 Pagar Parcela
                    </button>
                  )}
                  <button 
                    type="button"
                    className="btn btn-danger" 
                    style={{ padding: '7px 10px', fontSize: 12, background: '#2d0a0a', border: '1px solid #991b1b', color: '#ef4444', borderRadius: 8, cursor: 'pointer' }} 
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