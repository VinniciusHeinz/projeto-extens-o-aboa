import mongoose from 'mongoose';

// User (mantido para login dos operadores da ONG)
const userSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, required: true },
  phone:            { type: String, default: null },
  role:             { type: String, enum: ['admin', 'operador'], default: 'admin' },
  emailVerified:    { type: Boolean, default: true },
  verifyToken:      { type: String, default: null },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now },
});
export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Transaction adaptada para Prestação de Contas da ONG / ABOA
const transactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Bloqueado para alteração após criação ('income', 'expense', 'material_donation')
  type: { 
    type: String, 
    enum: ['income', 'expense', 'material_donation'], 
    required: true 
  },
  
  description: { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true },
  date:        { type: String, required: true },
  
  // Dados de Compliance e Emenda Governamental
  fundingSource: {
    type: String,
    default: 'Recursos Próprios / Doações',
    trim: true
  },
  amendmentCode: { type: String, default: '', trim: true },

  // Dados do Doador ou Fornecedor
  entityName: { type: String, default: '', trim: true },
  entityDoc:  { type: String, default: '', trim: true },

  // Itens em caso de doação material
  materialItem:     { type: String, default: '', trim: true },
  materialQuantity: { type: Number, default: 0 },

  // Documento comprobatório anexado
  receiptUrl: { type: String, default: null },

  // Auditoria de edição: armazena quais campos foram alterados após o registro
  editedFields: { type: [String], default: [] },
  updatedAt:    { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now }
});
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Bill (contas a pagar da ONG)
const billSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:              { type: String, required: true, trim: true },
  totalAmount:       { type: Number, required: true, min: 0 },
  installments:      { type: Number, default: 1 },
  installmentAmount: { type: Number, default: 0 },
  startDate:         { type: String, required: true },
  category:          { type: String, default: 'Outros', trim: true },
  paidInstallments:  { type: Number, default: 0 },
  createdAt:         { type: Date, default: Date.now },
});

billSchema.pre('save', function(next) {
  if (!this.installmentAmount && this.totalAmount && this.installments) {
    this.installmentAmount = this.totalAmount / this.installments;
  }
  next();
});

export const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);