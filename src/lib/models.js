import mongoose from 'mongoose';

// User (mantido para login dos operadores da ONG)
const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  phone:            { type: String, default: null },
  role:             { type: String, enum: ['admin', 'operador'], default: 'admin' },
  emailVerified:    { type: Boolean, default: false },
  verifyToken:      { type: String, default: null },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now },
});
export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Transaction adaptada para Prestação de Contas da ONG / ABOA
const transactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, required: true },
  
  // 'income' = entrada de recurso financeiro
  // 'material_donation' = doação física de produtos (alimentos, fraldas, etc.)
  // 'expense' = saída de recurso/pagamento
  type: { 
    type: String, 
    enum: ['income', 'expense', 'material_donation'], 
    required: true 
  },
  
  description: { type: String, required: true },
  amount:      { type: Number, required: true }, // Em material_donation, é o valor total estimado
  category:    { type: String, required: true },
  date:        { type: String, required: true },
  
  // Dados de Compliance e Emenda Governamental
  fundingSource: {
    type: String,
    enum: ['Doações Gerais', 'Emenda Governamental / Fomento', 'Eventos / Bazares'],
    default: 'Doações Gerais',
    required: true
  },
  amendmentCode: { type: String, default: '' }, // Número do processo/emenda governamental

  // Dados do Doador ou Fornecedor
  entityName: { type: String, default: '' }, // Nome do Doador ou Fornecedor da NF
  entityDoc:  { type: String, default: '' }, // CPF ou CNPJ

  // Itens em caso de doação material
  materialItem:     { type: String, default: '' }, // Ex: "Arroz tipo 1"
  materialQuantity: { type: Number, default: 0 },  // Ex: 50 (kg ou un)

  // Documento comprobatório anexado
  receiptUrl: { type: String, default: null }, // URL da NF ou comprovante escaneado
  
  createdAt: { type: Date, default: Date.now }
});
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Bill (contas a pagar da ONG mantidas)
const billSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, required: true },
  name:              { type: String, required: true },
  totalAmount:       { type: Number, required: true },
  installments:      { type: Number, default: 1 },
  installmentAmount: { type: Number, required: true },
  startDate:         { type: String, required: true },
  category:          { type: String, required: true },
  paidInstallments:  { type: Number, default: 0 },
  createdAt:         { type: Date, default: Date.now },
});
export const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);