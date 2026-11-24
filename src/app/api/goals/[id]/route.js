import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Goal } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req);
    const { amount } = await req.json();

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0)
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    await connectDB();
    const goal = await Goal.findOne({ _id: params.id, userId: user.id });
    if (!goal) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });

    goal.currentAmount = Math.min(goal.currentAmount + parsed, goal.targetAmount);
    await goal.save();
    return NextResponse.json({ ...goal.toObject(), id: goal._id });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const result = await Goal.deleteOne({ _id: params.id, userId: user.id });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}
