import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction, Bill } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Valor efetivamente pago de uma despesa (parcelas pendentes ainda não saíram do caixa)
function getExecutedExpense(t) {
  if (t.type !== 'expense') return 0;
  const status = t.paymentStatus || 'paid';
  if (status === 'pending') return 0;
  if (status === 'partial') return round2(t.paidAmount || 0);
  return round2(t.amount || 0);
}

// Valor pendente de pagamento de uma parcela agendada
function getPendingExpense(t) {
  if (t.type !== 'expense') return 0;
  const status = t.paymentStatus || 'paid';
  if (status === 'pending') return round2(t.amount || 0);
  if (status === 'partial') return Math.max(0, round2((t.amount || 0) - (t.paidAmount || 0)));
  return 0;
}

export async function GET(req) {
  try {
    verifyToken(req);
    await connectDB();

    // Limpeza definitiva: remove parcelas órfãs (com billId excluído ou parcelas antigas sem billId)
    const activeBills = await Bill.find({}, '_id').lean();
    const validBillIds = activeBills.map(b => b._id);
    await Transaction.deleteMany({
      $or: [
        { billId: { $ne: null, $nin: validBillIds } },
        { billId: null, description: { $regex: /\(\d+\/\d+\)$/ } }
      ]
    });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year  = searchParams.get('year');

    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
    const targetYear  = year ? Number(year) : new Date().getFullYear();

    const allRows = await Transaction.find({}).lean();

    let rows = allRows;
    if (month && year) {
      rows = rows.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return m === +month && y === +year;
      });
    }

    const income            = round2(rows.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0));
    const expense           = round2(rows.filter(t => t.type === 'expense').reduce((s, t) => s + getExecutedExpense(t), 0));
    const pendingExpenses   = round2(rows.filter(t => t.type === 'expense').reduce((s, t) => s + getPendingExpense(t), 0));
    const materialDonations = round2(rows.filter(t => t.type === 'material_donation').reduce((s, t) => s + (Number(t.amount) || 0), 0));

    // Gastos por Categoria contabiliza apenas despesas efetivamente pagas no mês
    const byCategory = Object.values(
      rows.filter(t => t.type === 'expense').reduce((acc, t) => {
        const spent = getExecutedExpense(t);
        if (spent <= 0) return acc;
        acc[t.category] = acc[t.category] || { category: t.category, total: 0 };
        acc[t.category].total = round2(acc[t.category].total + spent);
        return acc;
      }, {})
    );

    // Agrupa Entradas, Saídas, Compras Parceladas e Saldo por mês (AAAA-MM)
    const monthlyTotals = {};
    allRows.forEach(t => {
      if (!t.date) return;
      const [y, m] = t.date.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!monthlyTotals[key]) {
        monthlyTotals[key] = {
          month: key,
          income: 0,
          expense: 0,
          projectedExpense: 0,
          installmentsPaid: 0,
          installmentsTotal: 0,
          materialDonations: 0
        };
      }
      const amt = Number(t.amount) || 0;
      const isInstallment = Boolean(t.billId) || (Number(t.totalInstallments) || 0) > 1;

      if (t.type === 'income') {
        monthlyTotals[key].income = round2(monthlyTotals[key].income + amt);
      }
      if (t.type === 'expense') {
        const exec = getExecutedExpense(t);
        const pend = getPendingExpense(t);
        monthlyTotals[key].expense = round2(monthlyTotals[key].expense + exec);
        monthlyTotals[key].projectedExpense = round2(monthlyTotals[key].projectedExpense + exec + pend);

        if (isInstallment) {
          monthlyTotals[key].installmentsPaid = round2(monthlyTotals[key].installmentsPaid + exec);
          monthlyTotals[key].installmentsTotal = round2(monthlyTotals[key].installmentsTotal + exec + pend);
        }
      }
      if (t.type === 'material_donation') {
        monthlyTotals[key].materialDonations = round2(monthlyTotals[key].materialDonations + amt);
      }
    });

    // 1. Histórico Realizado: 6 meses encerrando no mês/ano selecionado
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const item = monthlyTotals[key] || {
        month: key,
        income: 0,
        expense: 0,
        projectedExpense: 0,
        installmentsPaid: 0,
        installmentsTotal: 0,
        materialDonations: 0
      };
      history.push({
        month: key,
        income: item.income,
        expense: item.expense,
        installments: item.installmentsPaid,
        materialDonations: item.materialDonations,
        balance: round2(item.income - item.expense)
      });
    }

    // 2. Projeção Futura: 6 meses a partir do mês/ano selecionado (inclui parcelas ainda agendadas)
    const projection = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(targetYear, targetMonth - 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const item = monthlyTotals[key] || {
        month: key,
        income: 0,
        expense: 0,
        projectedExpense: 0,
        installmentsPaid: 0,
        installmentsTotal: 0,
        materialDonations: 0
      };
      projection.push({
        month: key,
        income: item.income,
        expense: item.projectedExpense,
        installments: item.installmentsTotal,
        materialDonations: item.materialDonations,
        balance: round2(item.income - item.projectedExpense)
      });
    }

    return NextResponse.json({
      income,
      expense,
      pendingExpenses,
      materialDonations,
      investment: materialDonations,
      balance: round2(income - expense),
      salary: 0,
      byCategory,
      history,
      projection
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}