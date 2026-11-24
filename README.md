# 💰 Gerenciador de Gastos com IA

Aplicação web de controle financeiro pessoal com análise por inteligência artificial.

## Funcionalidades

- Login e registro de usuários
- Registro de transações (Entradas, Saídas, Investimentos)
- Resumo financeiro com regra 60/40
- Projeção anual de ganhos
- Gráficos por categoria e histórico mensal
- Metas financeiras com progresso
- Contas com parcelamento automático
- Alertas de vencimento
- Consultoria financeira com IA (Gemini)
- Exportar relatório em PDF
- Compartilhar resumo via WhatsApp

## Tecnologias

- Next.js 14
- MongoDB Atlas
- JWT Authentication
- Recharts
- Gemini AI

## Deploy

Hospedado na [Vercel](https://vercel.com).

## Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/expense-manager
JWT_SECRET=sua_chave_secreta
```
