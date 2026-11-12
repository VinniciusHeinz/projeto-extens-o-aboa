'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import {
  STORAGE_KEYS,
  DEFAULT_EXPENSE_CATS,
  DEFAULT_INCOME_CATS,
  DEFAULT_MATERIAL_CATS
} from './TransactionForm';

function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

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
          width: 220,
          zIndex: 10000,
          boxShadow: '0 8px 20px rgba(0,0,0,0.7)',
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

function EditedPencil({ isEdited }) {
  if (!isEdited) return null;
  return (
    <span
      title="Este campo foi editado após o lançamento original"
      style={{
        marginLeft: 6,
        fontSize: 12,
        color: '#f59e0b',
        background: 'rgba(245, 158, 11, 0.15)',
        padding: '1px 6px',
        borderRadius: 4,
        cursor: 'help',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontWeight: 600
      }}
    >
      ✏️ <span style={{ fontSize: 10 }}>Editado</span>
    </span>
  );
}

export default function TransactionList({ transactions, onDelete }) {
  const [tab, setTab] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Listas de categorias sincronizadas com o TransactionForm
  const [expenseCats, setExpenseCats] = useState(DEFAULT_EXPENSE_CATS);
  const [incomeCats, setIncomeCats] = useState(DEFAULT_INCOME_CATS);
  const [materialCats, setMaterialCats] = useState(DEFAULT_MATERIAL_CATS);

  const syncCategories = useCallback(() => {
    try {
      const savedExp = localStorage.getItem(STORAGE_KEYS.expense);
      const savedInc = localStorage.getItem(STORAGE_KEYS.income);
      const savedMat = localStorage.getItem(STORAGE_KEYS.material_donation);

      if (savedExp) setExpenseCats(JSON.parse(savedExp));
      if (savedInc) setIncomeCats(JSON.parse(savedInc));
      if (savedMat) setMaterialCats(JSON.parse(savedMat));
    } catch (e) {
      console.error('Erro ao ler categorias:', e);
    }
  }, []);

  useEffect(() => {
    syncCategories();
    window.addEventListener('aboa-categories-updated', syncCategories);
    return () => window.removeEventListener('aboa-categories-updated', syncCategories);
  }, [syncCategories]);

  const fmt = (v) =>
    `R$ ${Math.abs(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const bySource = transactions.filter((t) => {
    if (sourceFilter === 'ALL') return true;
    return (t.fundingSource || '').includes(sourceFilter);
  });

  const totalIncome = bySource.filter((t) => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalMaterial = bySource.filter((t) => t.type === 'material_donation').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalExpense = bySource.filter((t) => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const filtered = bySource.filter((t) => {
    if (tab === 'all') return true;
    return t.type === tab;
  });

  const totalDisplayed = filtered.reduce((acc, t) => {
    const val = Number(t.amount) || 0;
    return t.type === 'expense' ? acc - val : acc + val;
  }, 0);

  const openDetails = (tx) => {
    syncCategories();
    setSelectedTx(tx);
    setIsEditing(false);
    setErrorMsg('');
    setEditForm({
      description: tx.description || '',
      category: tx.category || '',
      date: tx.date || '',
      fundingSource: tx.fundingSource || 'Recursos Próprios / Doações',
      amendmentCode: tx.amendmentCode || '',
      entityName: tx.entityName || '',
      entityDoc: tx.entityDoc || '',
      materialItem: tx.materialItem || '',
      materialQuantity: tx.materialQuantity || 0,
      rawAmount: tx.amount || 0,
      amountFormatted: (tx.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      receiptUrl: tx.receiptUrl || null
    });
  };

  // Retorna exatamente a mesma lista do formulário de criação para o tipo do lançamento
  const getCategoriesForSelected = () => {
    if (!selectedTx) return [];
    let list = expenseCats;
    if (selectedTx.type === 'income') list = incomeCats;
    else if (selectedTx.type === 'material_donation') list = materialCats;

    // Garante que a categoria atual do registro apareça selecionada caso seja antiga
    if (selectedTx.category && !list.includes(selectedTx.category)) {
      return [selectedTx.category, ...list];
    }
    return list;
  };

  const handleAmountEdit = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setEditForm((prev) => ({ ...prev, rawAmount: 0, amountFormatted: '' }));
      return;
    }
    const num = parseFloat(digits) / 100;
    setEditForm((prev) => ({
      ...prev,
      rawAmount: num,
      amountFormatted: num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    }));
  };

  const handleFileEdit = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev) => ({ ...prev, receiptUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const saveEdit = async () => {
    if (!editForm.rawAmount || editForm.rawAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }
    if (editForm.fundingSource.includes('Emenda Governamental') && !String(editForm.amendmentCode).trim()) {
      setErrorMsg('Informe o número da Emenda ou Processo Administrativo.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const id = selectedTx.id || selectedTx._id;
      const { data } = await api.patch(`/transactions/${id}`, {
        description: editForm.description,
        category: editForm.category,
        date: editForm.date,
        fundingSource: editForm.fundingSource,
        amendmentCode: editForm.amendmentCode,
        entityName: editForm.entityName,
        entityDoc: editForm.entityDoc,
        materialItem: editForm.materialItem,
        materialQuantity: editForm.materialQuantity,
        amount: editForm.rawAmount,
        receiptUrl: editForm.receiptUrl
      });

      setSelectedTx(data);
      setIsEditing(false);
      onDelete();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este lançamento do Livro Caixa?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      if (selectedTx && (selectedTx.id === id || selectedTx._id === id)) {
        setSelectedTx(null);
      }
      onDelete();
    } catch (e) {
      alert('Erro ao excluir registro.');
    }
  };

  const isFieldEdited = (fieldName) => {
    if (!selectedTx) return false;
    const previouslyEdited = (selectedTx.editedFields || []).includes(fieldName);
    if (!isEditing) return previouslyEdited;

    if (fieldName === 'amount') {
      return previouslyEdited || Number(editForm.rawAmount) !== Number(selectedTx.amount);
    }
    return previouslyEdited || String(editForm[fieldName] || '') !== String(selectedTx[fieldName] || '');
  };

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #38bdf8',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#f8fafc',
    fontSize: 13,
    width: '100%'
  };

  const readOnlyStyle = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#f8fafc',
    fontSize: 13,
    width: '100%'
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
            Livro Caixa & Prestação de Contas — ABOA
            <InfoBadge text="Histórico oficial de movimentações. Clique em 'Mais Detalhes' em qualquer linha para ver a Nota Fiscal anexada ou editar informações." />
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Controle de entradas, doações de materiais e despesas vinculadas
          </p>
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, width: 'auto' }}
        >
          <option value="ALL">Todas as Fontes de Recurso</option>
          <option value="Recursos Próprios">Recursos Próprios / Doações</option>
          <option value="Emenda Governamental">Emenda Governamental / Fomento</option>
          <option value="Eventos">Eventos / Bazares</option>
        </select>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 18, borderBottom: '1px solid #334155', marginBottom: 16, overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setTab('all')}
          style={{
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === 'all' ? '#38bdf8' : '#64748b',
            borderBottom: tab === 'all' ? '2px solid #38bdf8' : '2px solid transparent'
          }}
        >
          Todas ({bySource.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('income')}
          style={{
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === 'income' ? '#22c55e' : '#64748b',
            borderBottom: tab === 'income' ? '2px solid #22c55e' : '2px solid transparent'
          }}
        >
          Entradas (R$) <span style={{ fontSize: 11, marginLeft: 4 }}>{fmt(totalIncome)}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('material_donation')}
          style={{
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === 'material_donation' ? '#3b82f6' : '#64748b',
            borderBottom: tab === 'material_donation' ? '2px solid #3b82f6' : '2px solid transparent'
          }}
        >
          Doações de Produtos <span style={{ fontSize: 11, marginLeft: 4 }}>{fmt(totalMaterial)}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('expense')}
          style={{
            background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === 'expense' ? '#ef4444' : '#64748b',
            borderBottom: tab === 'expense' ? '2px solid #ef4444' : '2px solid transparent'
          }}
        >
          Saídas / Despesas <span style={{ fontSize: 11, marginLeft: 4 }}>{fmt(totalExpense)}</span>
        </button>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: 28, fontSize: 13 }}>
          Nenhum registro encontrado para este filtro.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#64748b', textAlign: 'left', fontSize: 12 }}>
                <th style={{ padding: '10px 8px' }}>Data</th>
                <th style={{ padding: '10px 8px' }}>Descrição / Detalhes</th>
                <th style={{ padding: '10px 8px' }}>Doador / Fornecedor</th>
                <th style={{ padding: '10px 8px' }}>Recurso / Emenda</th>
                <th style={{ padding: '10px 8px' }}>Anexo</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Valor Total</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const id = t.id || t._id;
                const isInc = t.type === 'income';
                const isMat = t.type === 'material_donation';
                const color = isInc ? '#22c55e' : isMat ? '#38bdf8' : '#ef4444';
                const hasEdits = Array.isArray(t.editedFields) && t.editedFields.length > 0;

                return (
                  <tr key={id} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '12px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {t.date}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{t.description}</span>
                        {hasEdits && (
                          <span title="Este registro possui campos editados" style={{ fontSize: 12, color: '#f59e0b', cursor: 'help' }}>
                            ✏️
                          </span>
                        )}
                      </div>
                      {isMat && t.materialItem && (
                        <p style={{ fontSize: 11, color: '#38bdf8', margin: '2px 0' }}>
                          📦 {t.materialQuantity}x {t.materialItem}
                        </p>
                      )}
                      <span style={{ fontSize: 11, color: '#64748b' }}>{t.category}</span>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ color: '#cbd5e1' }}>{t.entityName || '—'}</div>
                      {t.entityDoc && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Doc: {t.entityDoc}</div>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: '#0f172a',
                        border: t.amendmentCode ? '1px solid #f59e0b' : '1px solid #334155',
                        color: t.amendmentCode ? '#fbbf24' : '#cbd5e1'
                      }}>
                        {t.fundingSource}
                      </span>
                      {t.amendmentCode && (
                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                          📋 Nº Emenda: {t.amendmentCode}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      {t.receiptUrl ? (
                        <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>📎 Com anexo</span>
                      ) : (
                        <span style={{ color: '#475569', fontSize: 12 }}>Sem anexo</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                      {isInc ? '+ ' : isMat ? '📦 ' : '- '}
                      {fmt(t.amount)}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => openDetails(t)}
                          style={{
                            background: '#0f172a',
                            color: '#38bdf8',
                            border: '1px solid #38bdf8',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🔍 Mais Detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(id)}
                          title="Excluir registro"
                          style={{
                            background: '#2d0a0a',
                            color: '#ef4444',
                            border: '1px solid #991b1b',
                            borderRadius: 6,
                            padding: '5px 9px',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé da Tabela com Cálculo Líquido */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #334155', fontSize: 13 }}>
        <span style={{ color: '#94a3b8' }}>
          {tab === 'all' ? 'Saldo líquido exibido' : 'Total exibido'} ({filtered.length} registro{filtered.length !== 1 ? 's' : ''})
        </span>
        <span style={{
          fontWeight: 700,
          fontSize: 15,
          color: totalDisplayed < 0 ? '#ef4444' : totalDisplayed > 0 ? '#22c55e' : '#f8fafc'
        }}>
          {totalDisplayed < 0 ? `- ${fmt(totalDisplayed)}` : fmt(totalDisplayed)}
        </span>
      </div>

      {/* Modal de Mais Detalhes + Visualização de NF + Edição Auditada */}
      {selectedTx && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.82)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSelectedTx(null)}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 14,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #334155', paddingBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: selectedTx.type === 'income' ? '#052e16' : selectedTx.type === 'material_donation' ? '#172554' : '#2d0a0a',
                  color: selectedTx.type === 'income' ? '#22c55e' : selectedTx.type === 'material_donation' ? '#38bdf8' : '#ef4444',
                  border: '1px solid currentColor'
                }}>
                  {selectedTx.type === 'income' ? '↓ Entrada Financeira (Tipo Fixo)' : selectedTx.type === 'material_donation' ? '📦 Doação de Produtos (Tipo Fixo)' : '↑ Saída / Despesa (Tipo Fixo)'}
                </span>
                {(selectedTx.editedFields?.length > 0) && (
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>
                    ✏️ Registro auditado com edições
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: isEditing ? '#334155' : '#f59e0b',
                    color: isEditing ? '#f8fafc' : '#0f172a',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isEditing ? 'Cancelar Edição' : '✏️ Editar Informações'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Grade de Campos Detalhados */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
              {/* 1. Descrição */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  Descrição *
                  <InfoBadge text="Resumo da movimentação registrado no livro caixa. Exemplo: Conta de água, Compra de alimentos." />
                  <EditedPencil isEdited={isFieldEdited('description')} />
                </label>
                {isEditing ? (
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    style={inputStyle}
                  />
                ) : (
                  <div style={readOnlyStyle}>{selectedTx.description}</div>
                )}
              </div>

              {/* 2. Categoria (Sincronizada com o formulário de criação) */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  Categoria *
                  <InfoBadge text="Exibe exatamente as mesmas categorias do formulário de registro, incluindo qualquer nova categoria que você adicionar." />
                  <EditedPencil isEdited={isFieldEdited('category')} />
                </label>
                {isEditing ? (
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {getCategoriesForSelected().map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={readOnlyStyle}>{selectedTx.category}</div>
                )}
              </div>

              {/* 3. Data */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  Data da Operação *
                  <InfoBadge text="Data em que o pagamento, recebimento ou doação ocorreu efetivamente." />
                  <EditedPencil isEdited={isFieldEdited('date')} />
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    style={inputStyle}
                  />
                ) : (
                  <div style={readOnlyStyle}>{selectedTx.date}</div>
                )}
              </div>

              {/* 4. Valor */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  Valor (R$) *
                  <InfoBadge text="Valor monetário total da operação formatado em Reais (R$)." />
                  <EditedPencil isEdited={isFieldEdited('amount')} />
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.amountFormatted}
                    onChange={handleAmountEdit}
                    style={{ ...inputStyle, fontWeight: 700 }}
                  />
                ) : (
                  <div style={{ ...readOnlyStyle, fontWeight: 700 }}>
                    {fmt(selectedTx.amount)}
                  </div>
                )}
              </div>

              {/* 5. Origem do Recurso */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  Origem do Recurso *
                  <InfoBadge text="Selecione a fonte do recurso utilizado. 'Emenda Governamental' exige o número do processo administrativo." />
                  <EditedPencil isEdited={isFieldEdited('fundingSource')} />
                </label>
                {isEditing ? (
                  <select
                    value={editForm.fundingSource}
                    onChange={(e) => setEditForm({ ...editForm, fundingSource: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="Recursos Próprios / Doações">Recursos Próprios / Doações</option>
                    <option value="Emenda Governamental / Termo de Fomento">Emenda Governamental</option>
                    <option value="Eventos / Bazares Beneficentes">Eventos / Bazares</option>
                  </select>
                ) : (
                  <div style={readOnlyStyle}>{selectedTx.fundingSource}</div>
                )}
              </div>

              {/* 6. Nº da Emenda */}
              {(isEditing ? editForm.fundingSource.includes('Emenda') || editForm.amendmentCode : selectedTx.fundingSource?.includes('Emenda') || selectedTx.amendmentCode) && (
                <div>
                  <label style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                    Nº da Emenda / Processo *
                    <InfoBadge text="Número oficial da emenda parlamentar, termo de fomento ou processo administrativo." />
                    <EditedPencil isEdited={isFieldEdited('amendmentCode')} />
                  </label>
                  {isEditing ? (
                    <input
                      value={editForm.amendmentCode}
                      onChange={(e) => setEditForm({ ...editForm, amendmentCode: e.target.value })}
                      style={{ ...inputStyle, borderColor: '#f59e0b' }}
                    />
                  ) : (
                    <div style={{ ...readOnlyStyle, border: '1px solid #f59e0b', color: '#fbbf24', fontWeight: 600 }}>
                      {selectedTx.amendmentCode || 'Não informado'}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Doador / Fornecedor */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  {selectedTx.type === 'expense' ? 'Fornecedor' : 'Doador / Parceiro'}
                  <InfoBadge text="Nome ou Razão Social da pessoa física, empresa ou órgão público vinculado ao lançamento." />
                  <EditedPencil isEdited={isFieldEdited('entityName')} />
                </label>
                {isEditing ? (
                  <input
                    value={editForm.entityName}
                    onChange={(e) => setEditForm({ ...editForm, entityName: e.target.value })}
                    placeholder="Nome ou Razão Social"
                    style={inputStyle}
                  />
                ) : (
                  <div style={readOnlyStyle}>
                    {selectedTx.entityName || 'Não informado'}
                  </div>
                )}
              </div>

              {/* 8. CPF / CNPJ */}
              <div>
                <label style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  CPF / CNPJ
                  <InfoBadge text="Documento fiscal do fornecedor ou doador. Digite apenas números; a pontuação é automática." />
                  <EditedPencil isEdited={isFieldEdited('entityDoc')} />
                </label>
                {isEditing ? (
                  <input
                    inputMode="numeric"
                    value={editForm.entityDoc}
                    onChange={(e) => setEditForm({ ...editForm, entityDoc: formatCpfCnpj(e.target.value) })}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    style={inputStyle}
                  />
                ) : (
                  <div style={readOnlyStyle}>
                    {selectedTx.entityDoc || 'Não informado'}
                  </div>
                )}
              </div>

              {/* 9. Campos de Doação de Produtos */}
              {selectedTx.type === 'material_donation' && (
                <>
                  <div>
                    <label style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                      Item Doado *
                      <InfoBadge text="Descrição do material ou produto recebido em doação." />
                      <EditedPencil isEdited={isFieldEdited('materialItem')} />
                    </label>
                    {isEditing ? (
                      <input
                        value={editForm.materialItem}
                        onChange={(e) => setEditForm({ ...editForm, materialItem: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={readOnlyStyle}>{selectedTx.materialItem}</div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                      Quantidade *
                      <InfoBadge text="Quantidade total de itens recebidos na doação." />
                      <EditedPencil isEdited={isFieldEdited('materialQuantity')} />
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={editForm.materialQuantity}
                        onChange={(e) => setEditForm({ ...editForm, materialQuantity: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div style={readOnlyStyle}>{selectedTx.materialQuantity}</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Seção do Comprovante Fiscal / Nota Fiscal */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center' }}>
                  📎 Documento Comprobatório / Nota Fiscal
                  <InfoBadge text="Visualização do recibo ou Nota Fiscal anexada. No modo de edição, você pode substituir ou anexar um novo arquivo PDF ou imagem." />
                  <EditedPencil isEdited={isFieldEdited('receiptUrl')} />
                </label>

                {isEditing && (
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileEdit}
                    style={{ fontSize: 12, color: '#94a3b8' }}
                  />
                )}
              </div>

              {(isEditing ? editForm.receiptUrl : selectedTx.receiptUrl) ? (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
                  {String(isEditing ? editForm.receiptUrl : selectedTx.receiptUrl).startsWith('data:application/pdf') ? (
                    <iframe
                      src={isEditing ? editForm.receiptUrl : selectedTx.receiptUrl}
                      title="Comprovante PDF"
                      style={{ width: '100%', height: 420, border: 'none', borderRadius: 6 }}
                    />
                  ) : (
                    <img
                      src={isEditing ? editForm.receiptUrl : selectedTx.receiptUrl}
                      alt="Comprovante Fiscal"
                      style={{ maxWidth: '100%', maxHeight: 420, display: 'block', margin: '0 auto', borderRadius: 6 }}
                    />
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#64748b', background: '#0f172a', padding: 16, borderRadius: 8, textAlign: 'center', margin: 0 }}>
                  Nenhum comprovante ou Nota Fiscal anexada a este registro. {isEditing && 'Use o botão acima para anexar.'}
                </p>
              )}
            </div>

            {errorMsg && (
              <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12, fontWeight: 600 }}>{errorMsg}</p>
            )}

            {/* Botão Salvar Edição */}
            {isEditing && (
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                style={{
                  width: '100%',
                  marginTop: 18,
                  padding: '12px',
                  background: '#22c55e',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Salvando alterações...' : '✓ Salvar Alterações (Marcar Campos Editados com ✏️)'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}