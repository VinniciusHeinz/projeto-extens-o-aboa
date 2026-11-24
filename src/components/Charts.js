'use client';
import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Cores exclusivas para despesas (o verde #22c55e fica reservado para o Caixa Disponível)
const EXPENSE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#f97316', '#a855f7'];
const CASH_COLOR = '#22c55e';

const fmt = v => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
          width: 240,
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

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Charts({ summary }) {
  const [showCashInPie, setShowCashInPie] = useState(true);

  const positiveCash = Math.max(Number(summary.balance) || 0, 0);

  const expenseSlices = (summary.byCategory || [])
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c, i) => ({
      name: c.category,
      value: c.total,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
      isCash: false
    }));

  const pieData = [
    ...(showCashInPie && positiveCash > 0
      ? [{ name: 'Caixa Disponível (Positivo)', value: positiveCash, color: CASH_COLOR, isCash: true }]
      : []),
    ...expenseSlices
  ];

  const barData = [
    { name: 'Entradas',             value: summary.income || 0,                                fill: '#22c55e' },
    { name: 'Saídas',               value: summary.expense || 0,                               fill: '#ef4444' },
    { name: 'Doações em Materiais', value: summary.materialDonations || summary.investment || 0, fill: '#f59e0b' },
    { name: 'Saldo em Caixa',       value: positiveCash,                                       fill: '#06b6d4' },
  ];

  return (
    <div className="grid-2" style={{ marginBottom: 24 }}>
      {/* Pizza — Despesas por Categoria + Caixa Disponível */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: 14, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
              Despesas por Categoria
              <InfoBadge text="Exibe a proporção dos gastos de cada categoria em relação ao saldo positivo disponível em caixa no mês selecionado." />
            </h3>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Distribuição das saídas e disponibilidade em caixa no mês
            </p>
          </div>

          {positiveCash > 0 && (
            <button
              type="button"
              onClick={() => setShowCashInPie(!showCashInPie)}
              style={{
                background: showCashInPie ? '#052e16' : '#0f172a',
                color: showCashInPie ? '#22c55e' : '#94a3b8',
                border: `1px solid ${showCashInPie ? '#22c55e' : '#334155'}`,
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Alternar exibição do caixa positivo no gráfico"
            >
              {showCashInPie ? `✓ Caixa Positivo: ${fmt(positiveCash)}` : '+ Exibir Caixa no Gráfico'}
            </button>
          )}
        </div>

        {pieData.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: 32 }}>
            Nenhuma movimentação registrada neste mês
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  labelLine={false}
                  label={<CustomLabel />}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {pieData.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: item.isCash ? '4px 8px' : '0 4px',
                    background: item.isCash ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    borderRadius: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: item.isCash ? '#22c55e' : '#94a3b8', fontWeight: item.isCash ? 700 : 400 }}>
                      {item.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.isCash ? '#22c55e' : '#e2e8f0' }}>
                    {fmt(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Barras — Balanço Mensal */}
      <div className="card">
        <h3 style={{ fontSize: 14, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center' }}>
          Balanço Mensal da Entidade
          <InfoBadge text="Comparativo visual entre o total de entradas financeiras, saídas realizadas, doações físicas estimadas e o saldo disponível em caixa." />
        </h3>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 12 }}>
          Comparativo de receitas, despesas e donativos físicos
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barSize={34}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} />
            <Tooltip
              formatter={(v) => [fmt(v)]}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          {barData.map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{item.name}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: item.fill }}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}