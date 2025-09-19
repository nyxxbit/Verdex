const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX']
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  telefone: {
    type: String,
    trim: true
  },
  endereco: {
    rua: String,
    numero: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  plano: {
    tipo: {
      type: String,
      enum: ['teste', 'basico', 'pro', 'enterprise'],
      default: 'teste'
    },
    dataInicio: {
      type: Date,
      default: Date.now
    },
    dataFim: Date,
    ativo: {
      type: Boolean,
      default: true
    }
  },
  configuracoes: {
    moeda: {
      type: String,
      default: 'BRL'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    categorizacaoAutomatica: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Índices
empresaSchema.index({ cnpj: 1 });
empresaSchema.index({ email: 1 });

module.exports = mongoose.models.Empresa || mongoose.model('Empresa', empresaSchema);