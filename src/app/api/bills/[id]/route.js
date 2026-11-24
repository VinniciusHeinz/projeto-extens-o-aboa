import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bill, Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const result = await Bill.deleteOne({ _id: params.id, userId: user.id });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    await Transaction.deleteMany({ billId: params.id, userId: user.id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

// PATCH — registrar pagamento de parcela(s)
export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req);
    const { paidAmount } = await req.json();

    if (!paidAmount || isNaN(parseFloat(paidAmount)) || parseFloat(paidAmount) <= 0)
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    await connectDB();
    const bill = await Bill.findOne({ _id: params.id, userId: user.id });
    if (!bill) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });

    const paid = parseFloat(paidAmount);
    // Calcula quantas parcelas esse valor cobre
    const parcelasCobertas = Math.round(paid / bill.installmentAmount);
    const novasPagas = Math.min(bill.paidInstallments + parcelasCobertas, bill.installments);

    await Bill.updateOne({ _id: params.id }, { paidInstallments: novasPagas });

    return NextResponse.json({ success: true, paidInstallments: novasPagas, installments: bill.installments });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
