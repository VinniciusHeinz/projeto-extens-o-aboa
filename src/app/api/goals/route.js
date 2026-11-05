import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Goal } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

const MAX_AMOUNT = 10_000_000;

export async function GET(req) {
  try {
    const user = verifyToken(req);
    await connectDB();
    const goals = await Goal.find({ userId: user.id }).lean();
    return NextResponse.json(goals.map(g => ({ ...g, id: g._id })));
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req);
    const { name, targetAmount, deadline, icon } = await req.json();

    if (!name || !targetAmount)
      return NextResponse.json({ error: 'Nome e valor são obrigatórios' }, { status: 400 });

    const parsed = parseFloat(targetAmount);
    if (isNaN(parsed) || parsed <= 0 || parsed > MAX_AMOUNT)
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    const cleanName = String(name).trim().slice(0, 200);

    await connectDB();
    const goal = await Goal.create({ userId: user.id, name: cleanName, targetAmount: parsed, deadline: deadline || null, icon: icon || '🎯' });
    return NextResponse.json({ ...goal.toObject(), id: goal._id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
