export default function SummaryCards({ summary, month, year }) {
  const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const income = summary.income || 0;
  const expense = summary.expense || 0;
  const investment = summary.investment || 0;
  const balance = summary.balance || 0;
  const salary = summary.salary || 0;
  const currentYear = year || new Date().getFullYear();

  // Projeção anual baseada só no Salário
  const projectedSalary = salary * 12;

  // Regra 60/40 — investimentos contam como reserva (saldo negativo não conta)
  const totalReserved = Math.max(balance, 0) + investment;
  const maxExpense = income * 0.6;
  const minSavings = income * 0.4;
  const expensePercent = income > 0 ? (expense / income) * 100 : 0;
  const savingsPercent = income > 0 ? (totalReserved / income) * 100 : 0;
  const expenseOk = expense <= maxExpense;
  const savingsOk = totalReserved >= minSavings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

      {/* Cards principais */}
      <div className="grid-4" style={{ marginBottom: 0 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Entradas</p>
          <p className="income" style={{ fontSize: 22, fontWeight: 700 }}>{fmt(income)}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Saídas</p>
          <p className="expense" style={{ fontSize: 22, fontWeight: 700 }}>{fmt(expense)}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Investimentos</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>{fmt(summary.investment || 0)}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Saldo do Mês</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Projeção anual de ganhos */}
      <div className="card" style={{ background: '#1a1f35', border: '1px solid #4f46e5' }}>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>📈 Projeção de Ganhos — {currentYear}</p>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Salário anual (salário × 12)</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{fmt(projectedSalary)}</p>
            <p style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
              {salary > 0 ? `baseado em ${fmt(salary)}/mês` : 'nenhum salário registrado'}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Economia projetada no ano</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: balance >= 0 ? '#6366f1' : '#ef4444' }}>
              {fmt(balance * 12)}
            </p>
            <p style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>saldo mensal × 12</p>
          </div>
        </div>
      </div>

      {/* Educação financeira 60/40 */}
      <div className="card" style={{ border: `1px solid ${expenseOk && savingsOk ? '#22c55e' : '#ef4444'}` }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Análise de Saúde Financeira</p>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Com base na metodologia 60/40, recomenda-se destinar no máximo <strong style={{ color: '#94a3b8' }}>60% da renda a despesas</strong> e reservar pelo menos <strong style={{ color: '#94a3b8' }}>40% para patrimônio e segurança financeira</strong>.
          </p>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Gastos */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Comprometimento de Renda</p>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Limite saudável: até 60%</p>
              </div>
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: expenseOk ? '#22c55e' : '#ef4444',
                background: expenseOk ? '#052e16' : '#2d0a0a',
                padding: '3px 10px', borderRadius: 20
              }}>
                {expensePercent.toFixed(1)}%
              </span>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                width: `${Math.min(expensePercent, 100)}%`,
                background: expenseOk ? '#22c55e' : '#ef4444',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#475569' }}>Despesas: {fmt(expense)}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>Teto: {fmt(maxExpense)}</span>
            </div>
          </div>

          {/* Reserva */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Capacidade de Reserva</p>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Meta mínima: 40% da renda</p>
              </div>
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: savingsOk ? '#6366f1' : '#ef4444',
                background: savingsOk ? '#1e1b4b' : '#2d0a0a',
                padding: '3px 10px', borderRadius: 20
              }}>
                {savingsPercent.toFixed(1)}%
              </span>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                width: `${Math.min(Math.max(savingsPercent, 0), 100)}%`,
                background: savingsOk ? '#6366f1' : '#ef4444',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#475569' }}>Reservando: {fmt(totalReserved)}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>Meta: {fmt(minSavings)}</span>
            </div>
          </div>
        </div>

        {/* Diagnóstico */}
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 8,
          background: expenseOk && savingsOk ? '#052e16' : income === 0 ? '#1e293b' : '#2d0a0a',
          borderLeft: `3px solid ${expenseOk && savingsOk ? '#22c55e' : income === 0 ? '#334155' : '#ef4444'}`,
        }}>
          <p style={{ fontSize: 13, color: expenseOk && savingsOk ? '#22c55e' : income === 0 ? '#64748b' : '#ef4444', fontWeight: 500 }}>
            {income === 0
              ? 'Registre suas entradas do mês para visualizar o diagnóstico financeiro.'
              : expenseOk && savingsOk
              ? 'Sua gestão financeira está alinhada com as boas práticas. Continue mantendo esse equilíbrio.'
              : !expenseOk && !savingsOk
              ? `Atenção: suas despesas estão ${(expensePercent - 60).toFixed(1)}% acima do recomendado e a reserva está abaixo da meta mínima de 40%.`
              : !expenseOk
              ? `Suas despesas estão ${(expensePercent - 60).toFixed(1)}% acima do limite de 60%. Revise os gastos para reequilibrar o orçamento.`
              : `Sua reserva está ${(40 - savingsPercent).toFixed(1)}% abaixo da meta. Considere reduzir despesas variáveis para atingir os 40%.`
            }
          </p>
        </div>
      </div>

    </div>
  );
}
