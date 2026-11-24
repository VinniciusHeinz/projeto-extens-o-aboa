import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(req) {
  try {
    verifyToken(req); // Valida se o operador está autenticado
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year  = searchParams.get('year');

    // Busca compartilhada de todos os lançamentos da ABOA
    const allRows = await Transaction.find({}).lean();

    let rows = allRows;
    if (month && year) {
      rows = rows.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return m === +month && y === +year;
      });
    }

    const income            = rows.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense           = rows.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const materialDonations = rows.filter(t => t.type === 'material_donation').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const byCategory = Object.values(
      rows.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = acc[t.category] || { category: t.category, total: 0 };
        acc[t.category].total += (Number(t.amount) || 0);
        return acc;
      }, {})
    );

    const monthlyHistory = {};
    allRows.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!monthlyHistory[key]) {
        monthlyHistory[key] = { month: key, income: 0, expense: 0, materialDonations: 0, investment: 0 };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === 'income')            monthlyHistory[key].income            += amt;
      if (t.type === 'expense')           monthlyHistory[key].expense           += amt;
      if (t.type === 'material_donation') {
        monthlyHistory[key].materialDonations += amt;
        monthlyHistory[key].investment        += amt;
      }
    });

    const history = Object.values(monthlyHistory)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    return NextResponse.json({
      income,
      expense,
      materialDonations,
      investment: materialDonations,
      balance: income - expense,
      salary: 0,
      byCategory,
      history
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}