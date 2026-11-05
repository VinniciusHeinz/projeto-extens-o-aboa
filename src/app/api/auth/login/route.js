import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { signToken } from '@/lib/authMiddleware';

// Rate limiting em memória (por IP) — máx 10 tentativas em 15 min
const loginAttempts = new Map();

function getRateLimit(ip) {
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutos
  const max = 10;

  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now };

  // Reset se janela expirou
  if (now - entry.firstAttempt > window) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { blocked: false };
  }

  if (entry.count >= max) {
    const remaining = Math.ceil((window - (now - entry.firstAttempt)) / 60000);
    return { blocked: true, remaining };
  }

  loginAttempts.set(ip, { count: entry.count + 1, firstAttempt: entry.firstAttempt });
  return { blocked: false };
}

export async function POST(req) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const rate = getRateLimit(ip);
    if (rate.blocked) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${rate.remaining} minuto(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase().slice(0, 200);
    const password = body.password || '';

    if (!email || !password)
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

    await connectDB();
    const user = await User.findOne({ email });

    // Sempre compara hash para evitar timing attack
    const dummyHash = '$2a$12$dummyhashtopreventtimingattacksonnonexistentusers12345';
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !valid)
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

    if (!user.emailVerified)
      return NextResponse.json({ error: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.' }, { status: 403 });

    // Login bem-sucedido — limpa tentativas do IP
    loginAttempts.delete(ip);

    const token = signToken({ id: user._id, name: user.name, email: user.email });
    return NextResponse.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
