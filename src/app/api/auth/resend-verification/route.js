import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmail } from '@/lib/mailer';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

    await connectDB();
    const user = await User.findOne({ email });

    if (!user || user.emailVerified)
      return NextResponse.json({ message: 'Se o e-mail existir e não estiver verificado, você receberá um novo link.' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyToken = verifyToken;
    await user.save();

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://relatorio-financeiro-five.vercel.app'}/api/auth/verify-email?token=${verifyToken}`;

    await sendEmail({
      to: email,
      subject: 'Confirme seu e-mail — Gerenciador de Gastos',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px">
          <h2 style="color:#6366f1;margin-bottom:16px">💰 Gerenciador de Gastos</h2>
          <p style="margin-bottom:16px">Olá, <strong>${user.name}</strong>!</p>
          <p style="margin-bottom:24px;color:#94a3b8">Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">
            Confirmar E-mail
          </a>
          <p style="font-size:12px;color:#475569">Se você não criou esta conta, ignore este e-mail.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Novo link enviado! Verifique sua caixa de entrada.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
