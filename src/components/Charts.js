'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#f97316'];

const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null; // esconde fatias muito pequenas
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Charts({ summary }) {
  const pieData = (summary.byCategory || [])
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ name: c.category, value: c.total }));

  const barData = [
    { name: 'Entradas',      value: summary.income      || 0, fill: '#22c55e' },
    { name: 'Saídas',        value: summary.expense     || 0, fill: '#ef4444' },
    { name: 'Investimentos', value: summary.investment  || 0, fill: '#6366f1' },
    { name: 'Saldo',         value: Math.max(summary.balance || 0, 0), fill: '#06b6d4' },
  ];

  return (
    <div className="grid-2" style={{ marginBottom: 24 }}>
      {/* Pizza — Gastos por Categoria */}
      <div className="card">
        <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Gastos por Categoria</h3>
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Apenas saídas do mês selecionado</p>
        {pieData.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: 32 }}>Nenhuma saída registrada neste mês</p>
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
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legenda manual com valores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {pieData.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Barras — Resumo Financeiro */}
      <div className="card">
        <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Resumo Financeiro</h3>
        <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Visão geral do mês selecionado</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
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
        {/* Valores abaixo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          {barData.map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>{item.name}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: item.fill }}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
