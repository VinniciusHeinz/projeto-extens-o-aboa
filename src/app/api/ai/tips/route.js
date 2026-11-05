import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDB } from '@/lib/mongodb';
import { Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/authMiddleware';

// Cache em memória por usuário — evita chamadas repetidas à API
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora
const MAX_CACHE = 500; // máximo de entradas

function setCache(key, data) {
  // Se lotou, remove as entradas mais antigas
  if (cache.size >= MAX_CACHE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    oldest.forEach(([k]) => cache.delete(k));
  }
  cache.set(key, { data, at: Date.now() });
}

export async function POST(req) {
  try {
    const user = verifyToken(req);
    const { apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: 'Chave da API Gemini é obrigatória' }, { status: 400 });

    // Verifica cache do servidor
    const cacheKey = `${user.id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    await connectDB();
    const allTx = await Transaction.find({ userId: user.id }).sort({ date: -1 }).limit(50).lean();

    const income     = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense    = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const investment = allTx.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const balance    = income - expense - investment;

    const prompt = `
Você é um consultor financeiro pessoal sênior. Analise os dados financeiros abaixo e retorne um JSON estruturado com sua análise.

Resumo:
- Entradas: R$ ${income.toFixed(2)}
- Saídas: R$ ${expense.toFixed(2)}
- Investimentos: R$ ${investment.toFixed(2)}
- Saldo líquido: R$ ${balance.toFixed(2)}

Transações recentes:
${allTx.map(t => `- ${t.date} | ${t.type === 'income' ? 'Entrada' : t.type === 'investment' ? 'Investimento' : 'Saída'} | ${t.category} | ${t.description} | R$ ${t.amount.toFixed(2)}`).join('\n')}

Retorne APENAS um JSON válido neste formato exato, sem markdown, sem texto fora do JSON:
{
  "diagnostico": "parágrafo profissional de 2-3 linhas sobre a situação financeira geral",
  "status": "positivo" ou "atencao" ou "critico",
  "dicas": [
    { "titulo": "título curto", "descricao": "descrição prática de 1-2 linhas", "icone": "emoji" },
    { "titulo": "título curto", "descricao": "descrição prática de 1-2 linhas", "icone": "emoji" },
    { "titulo": "título curto", "descricao": "descrição prática de 1-2 linhas", "icone": "emoji" }
  ],
  "alerta": "uma frase curta de alerta ou ponto de atenção principal, ou null se não houver"
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    setCache(cacheKey, parsed);
    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('invalid'))
      return NextResponse.json({ error: 'Chave Gemini inválida. Verifique em aistudio.google.com/apikey' }, { status: 400 });
    if (msg.includes('quota') || msg.includes('QUOTA'))
      return NextResponse.json({ error: 'Limite da API atingido. Tente novamente mais tarde.' }, { status: 429 });
    return NextResponse.json({ error: 'Erro ao consultar IA: ' + msg }, { status: 500 });
  }
}


