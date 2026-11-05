import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

function validatePassword(password) {
  if (password.length < 8)
    return 'A senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(password))
    return 'A senha deve conter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(password))
    return 'A senha deve conter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(password))
    return 'A senha deve conter pelo menos um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'A senha deve conter pelo menos um caractere especial (!@#$%...)';
  return null;
}

export async function POST(req) {
  try {
    const { token, email, password } = await req.json();
    if (!token || !email || !password)
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const pwError = validatePassword(password);
    if (pwError)
      return NextResponse.json({ error: pwError }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });

    if (user.email !== email.trim().toLowerCase())
      return NextResponse.json({ error: 'E-mail não corresponde ao cadastro' }, { status: 400 });

    user.password = await bcrypt.hash(password, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return NextResponse.json({ message: 'Senha redefinida com sucesso!' });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
