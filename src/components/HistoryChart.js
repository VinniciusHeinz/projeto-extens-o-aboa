'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function HistoryChart({ history }) {
  if (!history || history.length < 2) return null;

  const data = history.map(h => ({
    mes: h.month.slice(5) + '/' + h.month.slice(0, 4),
    Entradas: +h.income.toFixed(2),
    Saídas: +h.expense.toFixed(2),
    Investimentos: +h.investment.toFixed(2),
    Saldo: +(h.income - h.expense - h.investment).toFixed(2),
  }));

  const fmtAxis = v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Evolução Financeira</p>
      <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Comparativo dos últimos meses</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtAxis} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Line type="monotone" dataKey="Entradas"      stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Saídas"        stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Investimentos" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Saldo"         stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
