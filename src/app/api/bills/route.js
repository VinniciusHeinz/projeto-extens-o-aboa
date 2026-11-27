import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bill, Transaction, User } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

const MAX_AMOUNT = 10_000_000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export async function GET(req) {
  try {
    verifyToken(req);
    await connectDB();

    const [bills, users, billTxs] = await Promise.all([
      Bill.find({}).sort({ startDate: 1 }).lean(),
      User.find({}, 'name').lean(),
      Transaction.find({ billId: { $ne: null } }).sort({ installmentNumber: 1 }).lean()
    ]);

    const userMap = {};
    users.forEach(u => {
      userMap[String(u._id)] = u.name;
    });

    const txsByBill = {};
    billTxs.forEach(t => {
      const k = String(t.billId);
      if (!txsByBill[k]) txsByBill[k] = [];
      txsByBill[k].push(t);
    });

    return NextResponse.json(
      bills.map(b => {
        const totalAmount = round2(b.totalAmount);
        const totalPaid =
          b.totalPaidAmount !== undefined && b.totalPaidAmount !== null
            ? round2(b.totalPaidAmount)
            : round2((b.paidInstallments || 0) * (b.installmentAmount || 0));

        const remainingAmount = Math.max(0, round2(totalAmount - totalPaid));
        const linkedTxs = txsByBill[String(b._id)] || [];

        // Identifica a próxima parcela pendente ou parcialmente paga
        const activeTx = linkedTxs.find(t => (t.paymentStatus || 'paid') !== 'paid');
        let currentInstallmentNumber = null;
        let currentInstallmentTotal = round2(b.installmentAmount || totalAmount);
        let currentInstallmentPaid = 0;
        let currentInstallmentRemaining = 0;

        if (activeTx && remainingAmount > 0) {
          currentInstallmentNumber = activeTx.installmentNumber || (b.paidInstallments || 0) + 1;
          currentInstallmentTotal = round2(activeTx.amount);
          currentInstallmentPaid =
            activeTx.paymentStatus === 'partial' ? round2(activeTx.paidAmount || 0) : 0;
          currentInstallmentRemaining = Math.max(
            0,
            round2(currentInstallmentTotal - currentInstallmentPaid)
          );
        } else if (remainingAmount > 0) {
          currentInstallmentNumber = (b.paidInstallments || 0) + 1;
          currentInstallmentRemaining = Math.min(remainingAmount, currentInstallmentTotal);
        }

        return {
          ...b,
          id: b._id,
          totalPaidAmount: totalPaid,
          remainingAmount,
          currentInstallmentNumber,
          currentInstallmentTotal,
          currentInstallmentPaid,
          currentInstallmentRemaining,
          createdByName: b.createdByName || userMap[String(b.userId)] || 'Diretoria ABOA'
        };
      })
    );
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

    const total = round2(totalAmount);
    if (isNaN(total) || total <= 0 || total > MAX_AMOUNT)
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    const parcelas = Math.min(Math.max(parseInt(installments) || 1, 1), 60);

    if (!DATE_REGEX.test(startDate))
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });

    const cleanName = String(name).trim().slice(0, 200);
    const cleanCat = String(category).trim().slice(0, 100);
    const baseInstallment = round2(total / parcelas);

    await connectDB();
    const dbUser = await User.findById(user.id).lean();
    const operatorName = dbUser?.name || user.name || 'Diretoria ABOA';

    const bill = await Bill.create({
      userId: user.id,
      createdByName: operatorName,
      name: cleanName,
      totalAmount: total,
      installments: parcelas,
      installmentAmount: baseInstallment,
      startDate,
      category: cleanCat,
      paidInstallments: 0,
      totalPaidAmount: 0
    });

    const [year, month, day] = startDate.split('-').map(Number);
    const txDocs = [];
    for (let i = 0; i < parcelas; i++) {
      const d = new Date(year, month - 1 + i, day);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // Ajusta eventual diferença de centavos na última parcela
      const amt =
        i === parcelas - 1
          ? round2(total - baseInstallment * (parcelas - 1))
          : baseInstallment;

      txDocs.push({
        userId: user.id,
        createdByName: operatorName,
        type: 'expense',
        description: parcelas > 1 ? `${cleanName} (${i + 1}/${parcelas})` : cleanName,
        amount: amt,
        paidAmount: 0,
        paymentStatus: 'pending',
        category: cleanCat,
        fundingSource: 'Recursos Próprios / Doações',
        date: dateStr,
        billId: bill._id,
        installmentNumber: i + 1,
        totalInstallments: parcelas
      });
    }
    await Transaction.insertMany(txDocs);

    return NextResponse.json({ ...bill.toObject(), id: bill._id }, { status: 201 });
  } catch (e) {
    console.error('Erro ao criar conta a pagar:', e);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}