import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';
import bcrypt from 'bcryptjs';

export async function GET(req) {
  try {
    const auth = verifyToken(req);
    await connectDB();
    const user = await User.findById(auth.id).select('-password -resetToken -resetTokenExpiry -verifyToken').lean();
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}

export async function PATCH(req) {
  try {
    const auth = verifyToken(req);
    const { phone, name, currentPassword, newPassword } = await req.json();
    await connectDB();
    const user = await User.findById(auth.id);
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    if (phone !== undefined) user.phone = String(phone || '').trim().slice(0, 20) || null;
    if (name) user.name = String(name).trim().slice(0, 100);

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: 'Senha atual obrigatória' }, { status: 400 });
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'Nova senha deve ter pelo menos 8 caracteres' }, { status: 400 });
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();
    return NextResponse.json({ message: 'Perfil atualizado!', name: user.name, phone: user.phone });
  } catch (e) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
}
