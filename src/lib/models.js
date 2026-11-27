import mongoose from 'mongoose';

// User (diretoria da ONG)
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

// Transaction adaptada para Prestação de Contas da ABOA
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  type: { 
    type: String, 
    enum: ['income', 'expense', 'material_donation'], 
    required: true 
  },
  
  description: { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true },
  date:        { type: String, required: true },
  
  fundingSource: {
    type: String,
    default: 'Recursos Próprios / Doações',
    trim: true
  },
  amendmentCode: { type: String, default: '', trim: true },

  entityName: { type: String, default: '', trim: true },
  entityDoc:  { type: String, default: '', trim: true },

  materialItem:     { type: String, default: '', trim: true },
  materialQuantity: { type: Number, default: 0 },

  receiptUrl:     { type: String, default: null },
  receiptExpired: { type: Boolean, default: false },

  // Vínculo e controle de pagamento de Contas a Pagar / Parcelamentos
  billId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  installmentNumber: { type: Number, default: null },
  totalInstallments: { type: Number, default: null },
  paymentStatus:     { type: String, enum: ['paid', 'partial', 'pending'], default: 'paid' },
  paidAmount:        { type: Number, default: null },

  // Rastreabilidade / Auditoria
  createdByName: { type: String, default: '', trim: true },
  updatedByName: { type: String, default: '', trim: true },
  editedFields:  { type: [String], default: [] },
  updatedAt:     { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now }
});
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Bill (contas a pagar e compromissos fixos da ONG)
const billSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:              { type: String, required: true, trim: true },
  totalAmount:       { type: Number, required: true, min: 0 },
  installments:      { type: Number, default: 1 },
  installmentAmount: { type: Number, default: 0 },
  startDate:         { type: String, required: true },
  category:          { type: String, default: 'Outros', trim: true },
  paidInstallments:  { type: Number, default: 0 },
  totalPaidAmount:   { type: Number, default: 0 },
  createdByName:     { type: String, default: '', trim: true },
  createdAt:         { type: Date, default: Date.now },
});

export const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema);