import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bill } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function GET(req) {
  try {
    const user = verifyToken(req);
    await connectDB();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7Str = `${in7.getFullYear()}-${String(in7.getMonth()+1).padStart(2,'0')}-${String(in7.getDate()).padStart(2,'0')}`;

    // Busca todas as contas não quitadas do usuário
    const bills = await Bill.find({ userId: user.id }).lean();

    const upcoming = [];

    for (const bill of bills) {
      const paid = bill.paidInstallments || 0;
      const total = bill.installments || 1;

      // Ignora contas quitadas
      if (paid >= total) continue;

      // Calcula a data da próxima parcela não paga
      const [year, month, day] = bill.startDate.split('-').map(Number);

      for (let i = paid; i < total; i++) {
        const d = new Date(year, month - 1 + i, day);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        // Só mostra parcelas que vencem nos próximos 7 dias
        if (dateStr >= todayStr && dateStr <= in7Str) {
          upcoming.push({
            id: `${bill._id}-${i}`,
            billId: bill._id,
            name: bill.name,
            description: total > 1 ? `${bill.name} (${i + 1}/${total})` : bill.name,
            amount: bill.installmentAmount || bill.totalAmount,
            date: dateStr,
            category: bill.category,
            installment: i + 1,
            totalInstallments: total,
          });
          break; // Só mostra a próxima parcela de cada conta
        }

        // Se a data já passou do range, para de verificar
        if (dateStr > in7Str) break;
      }
    }

    // Ordena por data
    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(upcoming);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
