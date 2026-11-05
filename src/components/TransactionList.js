'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import ConfirmModal from './ConfirmModal';

const TABS = [
  { key: 'all',               label: 'Todas',               color: '#94a3b8' },
  { key: 'income',            label: 'Entradas (R$)',       color: '#22c55e' },
  { key: 'material_donation', label: 'Doações de Produtos', color: '#38bdf8' },
  { key: 'expense',           label: 'Saídas / Despesas',   color: '#ef4444' },
];

const typeConfig = {
  income:            { color: '#22c55e', label: 'Entrada',   sign: '+' },
  expense:           { color: '#ef4444', label: 'Saída',     sign: '-' },
  material_donation: { color: '#38bdf8', label: 'Doação Mat', sign: '📦' },
};

export default function TransactionList({ transactions = [], onDelete }) {
  const [activeTab, setActiveTab] = useState('all');
  const [fundingFilter, setFundingFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Filtragem combinada por tipo e por origem de recurso (Emenda vs Próprio)
  const filtered = transactions.filter(t => {
    const matchType = activeTab === 'all' || t.type === activeTab;
    const matchFunding = fundingFilter === 'ALL' || t.fundingSource === fundingFilter;
    return matchType && matchFunding;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [activeTab, fundingFilter, transactions]);

  const totals = {
    income: transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    material_donation: transactions.filter(t => t.type === 'material_donation').reduce((s, t) => s + (t.amount || 0), 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
  };

  const del = async () => {
    try {
      await api.delete(`/transactions/${confirm.id}`);
      onDelete();
    } catch (e) {
      console.error('Erro ao excluir registro:', e.message);
    }
    setConfirm(null);
  };

  return (
    <div className="card" style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!confirm}
        title="Excluir movimentação?"
        message={`"${confirm?.description}" será removida permanentemente da prestação de contas.`}
        onConfirm={del}
        onCancel={() => setConfirm(null)}
      />

      {/* Modal de visualização rápida de comprovante escaneado */}
      {viewReceipt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#0f172a', borderRadius: 12, padding: 20, maxWidth: 650, width: '100%',
            border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, color: '#f8fafc', fontWeight: 600 }}>Comprovante Fiscal / Recibo</h3>
              <button 
                onClick={() => setViewReceipt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            {viewReceipt.startsWith('data:application/pdf') ? (
              <iframe src={viewReceipt} style={{ width: '100%', height: 480, border: 'none', borderRadius: 8 }} />
            ) : (
              <img src={viewReceipt} alt="Comprovante" style={{ width: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 8 }} />
            )}
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button 
                className="btn" 
                onClick={() => setViewReceipt(null)}
                style={{ background: '#334155', color: '#fff', padding: '6px 16px', borderRadius: 6 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header com Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            Livro Caixa & Prestação de Contas — ABOA
          </p>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Controle de entradas, doações de materiais e despesas vinculadas
          </span>
        </div>

        {/* Filtro por Origem de Recursos */}
        <select 
          value={fundingFilter} 
          onChange={(e) => setFundingFilter(e.target.value)}
          style={{ 
            background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500
          }}
        >
          <option value="ALL">Todas as Fontes de Recurso</option>
          <option value="Emenda Governamental / Fomento">🏛 Apenas Emenda Governamental</option>
          <option value="Doações Gerais">❤️ Recursos Próprios / Doações</option>
          <option value="Eventos / Bazares">🎪 Eventos e Bazares</option>
        </select>
      </div>

      {/* Abas de Tipos */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #334155', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent', 
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              color: activeTab === tab.key ? tab.color : '#64748b',
              transition: 'all 0.2s', marginBottom: -1, whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
                {fmt(totals[tab.key] || 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabela de Lançamentos */}
      {filtered.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '36px 0', fontSize: 14 }}>
          Nenhum lançamento encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Data</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Descrição / Detalhes</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Doador / Fornecedor</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Recurso</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>Anexo</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Valor Total</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => {
                const cfg = typeConfig[t.type] || typeConfig.expense;
                const isEmenda = t.fundingSource === 'Emenda Governamental / Fomento';

                return (
                  <tr 
                    key={t.id} 
                    style={{ borderBottom: '1px solid #1e293b' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Data */}
                    <td style={{ padding: '12px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {t.date}
                    </td>

                    {/* Descrição e Detalhes de Doação */}
                    <td style={{ padding: '12px', fontSize: 13, color: '#f1f5f9' }}>
                      <div style={{ fontWeight: 600 }}>{t.description}</div>
                      {t.type === 'material_donation' && t.materialItem && (
                        <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>
                          📦 {t.materialQuantity}x {t.materialItem}
                        </div>
                      )}
                      <span style={{ fontSize: 11, color: '#64748b' }}>{t.category}</span>
                    </td>

                    {/* Doador ou Fornecedor */}
                    <td style={{ padding: '12px', fontSize: 12, color: '#cbd5e1' }}>
                      {t.entityName ? (
                        <div>
                          <div>{t.entityName}</div>
                          {t.entityDoc && <span style={{ fontSize: 10, color: '#64748b' }}>Doc: {t.entityDoc}</span>}
                        </div>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>

                    {/* Origem do Recurso */}
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: isEmenda ? '#78350f' : '#0f172a',
                        color: isEmenda ? '#fef08a' : '#94a3b8',
                        border: isEmenda ? '1px solid #b45309' : '1px solid #334155'
                      }}>
                        {isEmenda ? `🏛 Emenda ${t.amendmentCode ? `(${t.amendmentCode})` : ''}` : t.fundingSource || 'Próprio'}
                      </span>
                    </td>

                    {/* Comprovante Digitalizado */}
                    <td style={{ padding: '12px' }}>
                      {t.receiptUrl ? (
                        <button
                          onClick={() => setViewReceipt(t.receiptUrl)}
                          style={{
                            background: '#0284c7', color: '#fff', border: 'none',
                            borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer'
                          }}
                          title="Visualizar Comprovante / NF"
                        >
                          📎 Ver NF
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#475569' }}>Sem anexo</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>
                      {cfg.sign} {fmt(t.amount)}
                    </td>

                    {/* Excluir */}
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: 11, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}
                        onClick={() => setConfirm({ id: t.id, description: t.description })}
                        title="Excluir Lançamento"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #334155' }}>
                <td colSpan={5} style={{ padding: '12px', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                  Total exibido ({filtered.length} {filtered.length === 1 ? 'registro' : 'registros'})
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>
                  {fmt(filtered.reduce((s, t) => s + (t.amount || 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button 
            className="btn" 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
            style={{ padding: '6px 12px', fontSize: 12, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Página {page} de {totalPages}
          </span>
          <button 
            className="btn" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
            disabled={page === totalPages}
            style={{ padding: '6px 12px', fontSize: 12, background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}