import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(req) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year  = searchParams.get('year');

    const allRows = await Transaction.find({ userId: user.id }).lean();

    let rows = allRows;
    if (month && year) {
      rows = rows.filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return m === +month && y === +year;
      });
    }

    const income     = rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense    = rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const investment = rows.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const salary     = rows.filter(t => t.type === 'income' && t.category === 'Salário').reduce((s, t) => s + t.amount, 0);

    const byCategory = Object.values(
      rows.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = acc[t.category] || { category: t.category, total: 0 };
        acc[t.category].total += t.amount;
        return acc;
      }, {})
    );

    const monthlyHistory = {};
    allRows.forEach(t => {
      const [y, m] = t.date.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!monthlyHistory[key]) monthlyHistory[key] = { month: key, income: 0, expense: 0, investment: 0 };
      if (t.type === 'income')     monthlyHistory[key].income     += t.amount;
      if (t.type === 'expense')    monthlyHistory[key].expense    += t.amount;
      if (t.type === 'investment') monthlyHistory[key].investment += t.amount;
    });
    const history = Object.values(monthlyHistory).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

    return NextResponse.json({ income, expense, investment, balance: income - expense - investment, salary, byCategory, history });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}


