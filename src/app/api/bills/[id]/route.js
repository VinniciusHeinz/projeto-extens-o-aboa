import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bill, Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function getTodayBrazil() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req);
    await connectDB();
    const result = await Bill.deleteOne({ _id: params.id });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    await Transaction.deleteMany({ billId: params.id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req);
    const { paidAmount } = await req.json();

    const paid = round2(paidAmount);
    if (!paid || isNaN(paid) || paid <= 0) {
      return NextResponse.json({ error: 'Informe um valor de pagamento válido maior que zero.' }, { status: 400 });
    }

    await connectDB();
    const bill = await Bill.findById(params.id);
    if (!bill) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const totalAmount = round2(bill.totalAmount);
    const currentTotalPaid =
      bill.totalPaidAmount !== undefined && bill.totalPaidAmount !== null
        ? round2(bill.totalPaidAmount)
        : round2((bill.paidInstallments || 0) * (bill.installmentAmount || 0));

    const remainingBefore = round2(totalAmount - currentTotalPaid);
    if (remainingBefore <= 0) {
      return NextResponse.json({ error: 'Esta conta já está totalmente quitada.' }, { status: 400 });
    }

    if (paid > remainingBefore + 0.009) {
      return NextResponse.json(
        {
          error: `O valor informado (R$ ${paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é maior que o saldo restante da conta (R$ ${remainingBefore.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
        },
        { status: 400 }
      );
    }

    const todayStr = getTodayBrazil();
    const newTotalPaid = Math.min(totalAmount, round2(currentTotalPaid + paid));
    const isFullPayoff = newTotalPaid >= totalAmount - 0.009;

    const txs = await Transaction.find({ billId: bill._id }).sort({ installmentNumber: 1, date: 1 });

    if (txs.length === 0) {
      await Transaction.create({
        userId: user.id,
        createdByName: bill.createdByName || 'Diretoria ABOA',
        type: 'expense',
        description: isFullPayoff ? `${bill.name} (Quitado)` : `${bill.name} (Pagamento Parcial)`,
        amount: totalAmount,
        paidAmount: newTotalPaid,
        paymentStatus: isFullPayoff ? 'paid' : 'partial',
        category: bill.category,
        fundingSource: 'Recursos Próprios / Doações',
        date: todayStr,
        billId: bill._id,
        installmentNumber: 1,
        totalInstallments: bill.installments
      });
    } else if (isFullPayoff) {
      const firstUnsettled = txs.find(t => (t.paymentStatus || 'paid') !== 'paid');
      if (firstUnsettled) {
        const alreadyPaidOnFirst =
          firstUnsettled.paymentStatus === 'partial' ? round2(firstUnsettled.paidAmount || 0) : 0;
        const consolidatedAmount = round2(alreadyPaidOnFirst + paid);
        const startNum = firstUnsettled.installmentNumber || 1;
        const endNum = bill.installments || 1;

        firstUnsettled.amount = consolidatedAmount;
        firstUnsettled.paidAmount = consolidatedAmount;
        firstUnsettled.paymentStatus = 'paid';
        firstUnsettled.date = todayStr;
        firstUnsettled.description =
          endNum > 1
            ? startNum === endNum
              ? `${bill.name} (${endNum}/${endNum} — Quitado)`
              : `${bill.name} (Quitado — Parcelas ${startNum} a ${endNum}/${endNum})`
            : `${bill.name} (Quitado)`;

        await firstUnsettled.save();

        const futureIds = txs
          .filter(t => String(t._id) !== String(firstUnsettled._id) && (t.paymentStatus || 'paid') !== 'paid')
          .map(t => t._id);

        if (futureIds.length > 0) {
          await Transaction.deleteMany({ _id: { $in: futureIds } });
        }
      }
    } else {
      let remainingToAllocate = paid;

      for (const tx of txs) {
        if (remainingToAllocate <= 0.001) break;
        const txFace = round2(tx.amount);
        const txAlreadyPaid =
          tx.paymentStatus === 'paid' ? txFace : round2(tx.paidAmount || 0);
        const txNeeded = round2(txFace - txAlreadyPaid);

        if (txNeeded <= 0.001) continue;

        const applied = Math.min(remainingToAllocate, txNeeded);
        const updatedTxPaid = round2(txAlreadyPaid + applied);
        remainingToAllocate = round2(remainingToAllocate - applied);

        tx.paidAmount = updatedTxPaid;
        if (updatedTxPaid >= txFace - 0.009) {
          tx.paymentStatus = 'paid';
          if (tx.date > todayStr) {
            tx.date = todayStr;
          }
        } else {
          tx.paymentStatus = 'partial';
          if (tx.date > todayStr) {
            tx.date = todayStr;
          }
        }
        await tx.save();
      }
    }

    const refreshedTxs = await Transaction.find({ billId: bill._id }).lean();
    const fullyPaidCount = isFullPayoff
      ? bill.installments
      : refreshedTxs.filter(t => (t.paymentStatus || 'paid') === 'paid').length;

    bill.totalPaidAmount = newTotalPaid;
    bill.paidInstallments = Math.min(fullyPaidCount, bill.installments);
    await bill.save();

    return NextResponse.json({
      success: true,
      totalPaidAmount: bill.totalPaidAmount,
      paidInstallments: bill.paidInstallments,
      installments: bill.installments
    });
  } catch (e) {
    console.error('Erro ao registrar baixa de conta:', e);
    return NextResponse.json({ error: 'Erro interno ao registrar pagamento' }, { status: 500 });
  }
}