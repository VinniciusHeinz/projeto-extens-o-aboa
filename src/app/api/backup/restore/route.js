import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction, Bill, Goal } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function POST(req) {
  try {
    const user = verifyToken(req);
    const { data } = await req.json();

    if (!data) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    await connectDB();

    const { transactions = [], bills = [], goals = [] } = data;

    // Importa transações (ignora duplicatas por descrição+data+valor)
    let txImported = 0;
    for (const t of transactions) {
      if (!t.type || !t.description || !t.amount || !t.date) continue;
      const exists = await Transaction.findOne({
        userId: user.id, description: t.description, date: t.date, amount: t.amount
      });
      if (!exists) {
        await Transaction.create({
          userId: user.id,
          type: t.type,
          description: String(t.description).trim().slice(0, 200),
          amount: parseFloat(t.amount),
          category: String(t.category || 'Outros').trim().slice(0, 100),
          date: t.date,
        });
        txImported++;
      }
    }

    // Importa contas (ignora duplicatas por nome+startDate)
    let billsImported = 0;
    for (const b of bills) {
      if (!b.name || !b.totalAmount || !b.startDate) continue;
      const exists = await Bill.findOne({ userId: user.id, name: b.name, startDate: b.startDate });
      if (!exists) {
        await Bill.create({
          userId: user.id,
          name: String(b.name).trim().slice(0, 200),
          totalAmount: parseFloat(b.totalAmount),
          installments: parseInt(b.installments) || 1,
          installmentAmount: parseFloat(b.installmentAmount || b.totalAmount),
          startDate: b.startDate,
          category: String(b.category || 'Outros').trim().slice(0, 100),
          paidInstallments: parseInt(b.paidInstallments) || 0,
        });
        billsImported++;
      }
    }

    // Importa metas (ignora duplicatas por nome)
    let goalsImported = 0;
    for (const g of goals) {
      if (!g.name || !g.targetAmount) continue;
      const exists = await Goal.findOne({ userId: user.id, name: g.name });
      if (!exists) {
        await Goal.create({
          userId: user.id,
          name: String(g.name).trim().slice(0, 200),
          targetAmount: parseFloat(g.targetAmount),
          currentAmount: parseFloat(g.currentAmount) || 0,
          deadline: g.deadline || null,
          icon: g.icon || '🎯',
        });
        goalsImported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: { transactions: txImported, bills: billsImported, goals: goalsImported }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao restaurar backup' }, { status: 500 });
  }
}
