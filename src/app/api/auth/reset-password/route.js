import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(req) {
  try {
    const { email, masterKey, newPassword } = await req.json();

    if (!email || !masterKey || !newPassword) {
      return NextResponse.json(
        { error: 'Preencha o e-mail, a chave de segurança da ONG e a nova senha.' },
        { status: 400 }
      );
    }

    const validKey = process.env.MASTER_RESET_KEY || 'ABOA-2026-DIR';
    if (String(masterKey).trim() !== validKey) {
      return NextResponse.json(
        { error: 'Chave de segurança inválida. Verifique com o responsável técnico.' },
        { status: 403 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado com este e-mail.' },
        { status: 404 }
      );
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return NextResponse.json(
      { message: 'Senha redefinida com sucesso! Faça login com a nova senha.' },
      { status: 200 }
    );
  } catch (e) {
    console.error('Erro ao redefinir senha:', e);
    return NextResponse.json({ error: 'Erro interno ao redefinir senha.' }, { status: 500 });
  }
}