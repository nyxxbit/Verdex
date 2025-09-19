// src/models/ContaBancaria.js
const mongoose = require('mongoose');

const contaBancariaSchema = new mongoose.Schema({
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  banco: {
    codigo: { type: String, required: true },
    nome: { type: String, required: true }
  },
  agencia: { type: String, required: true, trim: true },
  conta: { type: String, required: true, trim: true },
  digito: { type: String, trim: true },
  tipo: {
    type: String,
    enum: ['corrente', 'poupanca', 'investimento'],
    required: true
  },
  nome: { type: String, required: true, trim: true },
  
  // ALTERAÇÃO: Campos para o saldo inicial
  saldoInicial: {
    type: Number,
    required: true,
    default: 0
  },
  dataSaldoInicial: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  
  ativa: { type: Boolean, default: true },
  configuracoes: {
    importacaoAutomatica: { type: Boolean, default: false },
    notificacoes: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true }
});

// Índices
contaBancariaSchema.index({ empresa: 1 });
contaBancariaSchema.index({ 'banco.codigo': 1, agencia: 1, conta: 1 });

// Virtual para identificação completa
contaBancariaSchema.virtual('identificacao').get(function() {
  return `ag ${this.agencia} / cc ${this.conta}${this.digito ? '-' + this.digito : ''}`;
});

module.exports = mongoose.models.ContaBancaria || mongoose.model('ContaBancaria', contaBancariaSchema);