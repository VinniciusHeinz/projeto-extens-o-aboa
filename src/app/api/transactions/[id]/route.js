import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const result = await Transaction.deleteOne({ _id: params.id, userId: user.id });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}
