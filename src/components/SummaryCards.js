export default function SummaryCards({ summary, month, year }) {
  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const income = summary.income || 0;
  const expense = summary.expense || 0;
  const materialDonations = summary.materialDonations || summary.investment || 0;
  const balance = summary.balance || 0;

  // Indicador de equilíbrio financeiro da entidade
  const executionPercent = income > 0 ? (expense / income) * 100 : 0;
  const isSurplus = balance >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

      {/* Cards principais de fluxo de caixa */}
      <div className="grid-4" style={{ marginBottom: 0 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Entradas Financeiras</p>
          <p className="income" style={{ fontSize: 22, fontWeight: 700 }}>{fmt(income)}</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Saídas / Despesas</p>
          <p className="expense" style={{ fontSize: 22, fontWeight: 700 }}>{fmt(expense)}</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Doações em Produtos (Est.)</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{fmt(materialDonations)}</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Saldo em Caixa</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: isSurplus ? '#22c55e' : '#ef4444' }}>
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Card Institucional de Execução Financeira */}
      <div className="card" style={{ border: `1px solid ${isSurplus ? '#10b981' : '#ef4444'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
              Equilíbrio das Contas da Associação
            </p>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Demonstrativo de execução das receitas operacionais e doações no período selecionado.
            </p>
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: isSurplus ? '#22c55e' : '#ef4444',
            background: isSurplus ? '#052e16' : '#2d0a0a',
            padding: '4px 12px',
            borderRadius: 20
          }}>
            {income > 0 ? `${executionPercent.toFixed(1)}% das receitas executadas` : 'Sem receitas no mês'}
          </span>
        </div>

        {/* Barra de progresso de execução */}
        <div style={{ background: '#0f172a', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%',
            borderRadius: 6,
            width: `${Math.min(executionPercent, 100)}%`,
            background: isSurplus ? '#10b981' : '#ef4444',
            transition: 'width 0.5s ease'
          }} />
        </div>

        {/* Mensagem de status */}
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: income === 0 ? '#1e293b' : isSurplus ? '#052e16' : '#2d0a0a',
          borderLeft: `3px solid ${income === 0 ? '#334155' : isSurplus ? '#22c55e' : '#ef4444'}`
        }}>
          <p style={{ fontSize: 13, color: income === 0 ? '#94a3b8' : isSurplus ? '#22c55e' : '#ef4444', fontWeight: 500, margin: 0 }}>
            {income === 0
              ? 'Nenhuma entrada registrada neste mês até o momento.'
              : isSurplus
              ? `Operação com superávit de ${fmt(balance)}. Recursos suficientes para cobrir as despesas do mês.`
              : `Atenção: déficit operacional de ${fmt(Math.abs(balance))}. As saídas ultrapassaram o total de entradas no período.`}
          </p>
        </div>
      </div>

    </div>
  );
}