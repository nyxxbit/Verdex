// src/models/Obra.js
const mongoose = require('mongoose');

const obraSchema = new mongoose.Schema({
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contato', // Aponta para um contato do tipo 'cliente'
    required: true,
  },
  nome: {
    type: String,
    required: [true, 'O nome da obra é obrigatório.'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Planejamento', 'Em Andamento', 'Concluída', 'Cancelada'],
    default: 'Planejamento',
  },
  endereco: {
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
    rua: String,
    numero: String,
    cep: String,
  },
  dataInicio: { type: Date },
  dataFimPrevista: { type: Date },
  dataFimReal: { type: Date },
  responsaveis: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contato', // Aponta para contatos do tipo 'funcionario'
  }],
  observacoes: String,
}, {
  timestamps: true
});

obraSchema.index({ empresa: 1, cliente: 1 });
obraSchema.index({ status: 1 });

module.exports = mongoose.models.Obra || mongoose.model('Obra', obraSchema);