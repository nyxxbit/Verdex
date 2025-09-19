// src/models/Contato.js
const mongoose = require('mongoose');

const contatoSchema = new mongoose.Schema({
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  nome: {
    type: String,
    required: true,
    trim: true,
  },
  tipo: {
    type: String,
    // ALTERAÇÃO: Valores do enum agora em minúsculas para consistência
    enum: ['cliente', 'fornecedor', 'funcionario'], 
    required: true,
  },
  subtipoFornecedor: {
    type: String,
    trim: true,
  },
  obraAtual: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Obra',
  },
  documento: {
    numero: String,
    tipo: {
      type: String,
      enum: ['cpf', 'cnpj'],
    },
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  telefone: {
    type: String,
    trim: true,
  },
  endereco: {
    cidade: String,
    estado: String,
    rua: String,
    numero: String,
    cep: String,
  },
  ativo: {
    type: Boolean,
    default: true,  
  },
  observacoes: String,
}, {
  timestamps: true
});

contatoSchema.index({ empresa: 1, tipo: 1 });
contatoSchema.index({ nome: 'text' });

module.exports = mongoose.models.Contato || mongoose.model('Contato', contatoSchema);