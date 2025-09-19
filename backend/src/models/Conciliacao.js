const mongoose = require('mongoose');

const conciliacaoSchema = new mongoose.Schema({
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
  tipo: {
    type: String,
    enum: ['manual', 'lote', 'automatica'],
    required: true
  },
  dataInicio: {
    type: Date,
    required: true
  },
  dataFim: Date,
  status: {
    type: String,
    enum: ['em_andamento', 'concluida', 'cancelada'],
    default: 'em_andamento'
  },
  transacoes: [{
    transacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transacao',
      required: true
    },
    situacaoAnterior: {
      status: String,
      categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria'
      },
      contato: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contato'
      }
    },
    acaoRealizada: {
      type: String,
      enum: ['categorizada', 'contato_vinculado', 'ignorada', 'revertida'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  resumo: {
    totalTransacoes: {
      type: Number,
      default: 0
    },
    transacoesConciliadas: {
      type: Number,
      default: 0
    },
    transacoesIgnoradas: {
      type: Number,
      default: 0
    },
    valorTotal: {
      type: Number,
      default: 0
    }
  },
  configuracoes: {
    aplicarSugestoesAutomaticamente: {
      type: Boolean,
      default: false
    },
    confiancaMinima: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  },
  usuario: {
    type: String,
    required: true
  },
  observacoes: String
}, {
  timestamps: true
});

// Índices
conciliacaoSchema.index({ empresa: 1, createdAt: -1 });
conciliacaoSchema.index({ contaBancaria: 1, createdAt: -1 });
conciliacaoSchema.index({ status: 1 });

// Método para adicionar transação à conciliação
conciliacaoSchema.methods.adicionarTransacao = function(transacao, acao, situacaoAnterior = {}) {
  this.transacoes.push({
    transacao: transacao._id,
    situacaoAnterior,
    acaoRealizada: acao
  });
  
  this.resumo.totalTransacoes = this.transacoes.length;
  
  if (acao === 'categorizada') {
    this.resumo.transacoesConciliadas++;
  } else if (acao === 'ignorada') {
    this.resumo.transacoesIgnoradas++;
  }
  
  this.resumo.valorTotal += Math.abs(transacao.valor);
};

// Método para finalizar conciliação
conciliacaoSchema.methods.finalizar = function() {
  this.status = 'concluida';
  this.dataFim = new Date();
};

module.exports = mongoose.models.Conciliacao || mongoose.model('Conciliacao', conciliacaoSchema);