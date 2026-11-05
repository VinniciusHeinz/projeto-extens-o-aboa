import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bill, Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

const MAX_AMOUNT = 10_000_000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const bills = await Bill.find({ userId: user.id }).sort({ startDate: 1 }).lean();
    return NextResponse.json(bills.map(b => ({ ...b, id: b._id })));
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req);
    const { name, totalAmount, installments, startDate, category } = await req.json();

    if (!name || !totalAmount || !startDate || !category)
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });

    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0 || total > MAX_AMOUNT)
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    const parcelas = Math.min(Math.max(parseInt(installments) || 1, 1), 60);

    if (!DATE_REGEX.test(startDate))
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });

    const cleanName = String(name).trim().slice(0, 200);
    const cleanCat  = String(category).trim().slice(0, 100);
    const installmentAmount = Math.round((total / parcelas) * 100) / 100;

    await connectDB();
    const bill = await Bill.create({ userId: user.id, name: cleanName, totalAmount: total, installments: parcelas, installmentAmount, startDate, category: cleanCat });

    const [year, month, day] = startDate.split('-').map(Number);
    const txDocs = [];
    for (let i = 0; i < parcelas; i++) {
      const d = new Date(year, month - 1 + i, day);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      txDocs.push({
        userId: user.id, type: 'expense',
        description: parcelas > 1 ? `${cleanName} (${i + 1}/${parcelas})` : cleanName,
        amount: installmentAmount, category: cleanCat,
        date: dateStr, billId: bill._id,
      });
    }
    await Transaction.insertMany(txDocs);

    return NextResponse.json({ ...bill.toObject(), id: bill._id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
