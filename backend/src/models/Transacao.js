const mongoose = require('mongoose');

const transacaoSchema = new mongoose.Schema({
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  contaBancaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContaBancaria',
    required: true
  },
  data: {
    type: Date,
    required: true
  },
  descricao: {
    type: String,
    required: true,
    trim: true
  },
  valor: {
    type: Number,
    required: true
  },
  tipo: {
    type: String,
    enum: ['credito', 'debito'],
    required: true
  },
  origem: {
    type: String,
    enum: ['manual', 'ofx', 'api'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['pendente', 'conciliada', 'ignorada'],
    default: 'pendente'
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria'
  },
  contato: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contato'
  },
  conciliacao: {
    data: Date,
    usuario: String,
    tipo: {
      type: String,
      enum: ['manual', 'lote', 'automatica']
    }
  },
  sugestoes: [{
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria'
    },
    contato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contato'
    },
    confianca: {
      type: Number,
      min: 0,
      max: 100
    },
    motivo: String
  }],
  dadosOriginais: {
    fitid: String, // ID único do OFX
    memo: String,
    checknum: String
  },
  observacoes: String
}, {
  timestamps: true
});

// Índices
transacaoSchema.index({ empresa: 1, data: -1 });
transacaoSchema.index({ contaBancaria: 1, data: -1 });
transacaoSchema.index({ status: 1 });
transacaoSchema.index({ categoria: 1 });
transacaoSchema.index({ 'dadosOriginais.fitid': 1 });
transacaoSchema.index({ descricao: 'text' });

// Virtual para determinar se é receita ou despesa
transacaoSchema.virtual('natureza').get(function() {
  return this.valor > 0 ? 'receita' : 'despesa';
});

// Método para aplicar sugestão
transacaoSchema.methods.aplicarSugestao = function(sugestaoIndex) {
  const sugestao = this.sugestoes[sugestaoIndex];
  if (sugestao) {
    this.categoria = sugestao.categoria;
    this.contato = sugestao.contato;
    this.status = 'conciliada';
    this.conciliacao = {
      data: new Date(),
      tipo: 'automatica'
    };
  }
};

// Método para gerar palpite/sugestão baseado na descrição
transacaoSchema.statics.gerarSugestao = async function(descricao, empresaId) {
  const Categoria = require('./Categoria');
  
  // Buscar categorias da empresa e padrão
  const categorias = await Categoria.find({
    $or: [
      { empresa: empresaId },
      { padrao: true }
    ],
    ativa: true
  });

  const descricaoLower = descricao.toLowerCase();
  const sugestoes = [];

  for (const categoria of categorias) {
    let confianca = 0;
    let motivo = '';

    // Verificar palavras-chave da categoria
    for (const palavra of categoria.palavrasChave) {
      if (descricaoLower.includes(palavra)) {
        confianca += 20;
        motivo = `Contém palavra-chave: "${palavra}"`;
        break;
      }
    }

    // Análise adicional baseada em padrões
    if (descricaoLower.includes('pix') && categoria.nome.includes('Serviços contratados')) {
      confianca += 30;
      motivo = 'Transação PIX comum para serviços';
    }

    if (descricaoLower.includes('ted') && categoria.nome.includes('Receita com serviços')) {
      confianca += 35;
      motivo = 'TED geralmente indica receita';
    }

    if (descricaoLower.includes('tarifa') && categoria.nome.includes('Tarifa bancária')) {
      confianca += 40;
      motivo = 'Tarifa bancária identificada';
    }

    if (confianca > 15) {
      sugestoes.push({
        categoria: categoria._id,
        confianca: Math.min(confianca, 95),
        motivo
      });
    }
  }

  // Ordenar por confiança
  return sugestoes.sort((a, b) => b.confianca - a.confianca).slice(0, 3);
};

module.exports = mongoose.models.Transacao || mongoose.model('Transacao', transacaoSchema);