import { NextResponse } from 'next/server';

export async function GET() {
  // Retorna array vazio para desativar as metas pessoais da base legada
  return NextResponse.json({ goals: [] }, { status: 200 });
}

export async function POST() {
  return NextResponse.json(
    { message: 'Módulo de metas desativado temporariamente.' },
    { status: 200 }
  );
}