import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmail } from '@/lib/mailer';

// Validação de força de senha
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
    const body = await req.json();
    const name = (body.name || '').trim().slice(0, 100);
    const email = (body.email || '').trim().toLowerCase().slice(0, 200);
    const password = body.password || '';

    if (!name || !email || !password)
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });

    // Validação de força de senha
    const pwError = validatePassword(password);
    if (pwError)
      return NextResponse.json({ error: pwError }, { status: 400 });

    await connectDB();
    const exists = await User.findOne({ email });
    if (exists)
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await User.create({ name, email, password: hash, verifyToken, emailVerified: false });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://relatorio-financeiro-five.vercel.app'}/api/auth/verify-email?token=${verifyToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Confirme seu e-mail — Gerenciador de Gastos',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
            <h2 style="color:#6366f1;margin-bottom:16px">💰 Gerenciador de Gastos</h2>
            <p style="margin-bottom:16px">Olá, <strong>${name}</strong>!</p>
            <p style="margin-bottom:24px;color:#94a3b8">Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
              Confirmar E-mail
            </a>
            <p style="font-size:12px;color:#475569">Se você não criou esta conta, ignore este e-mail.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Erro ao enviar email:', emailErr.message);
    }

    return NextResponse.json({ message: 'Conta criada! Verifique seu e-mail para ativar.' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
