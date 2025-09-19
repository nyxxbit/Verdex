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
    motivo: String,
    fontes: [String],
    aplicada: {
      type: Boolean,
      default: false
    },
    criadaEm: {
      type: Date,
      default: Date.now
    }
  }],
  // Histórico de categorizações para aprendizado
  historicoCategorizacao: [{
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria'
    },
    dataCategorizacao: {
      type: Date,
      default: Date.now
    },
    usuario: String,
    metodo: {
      type: String,
      enum: ['manual', 'sugestao', 'batch'],
      default: 'manual'
    }
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

// Método tradicional para aplicar sugestão
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
    
    // Marcar sugestão como aplicada
    sugestao.aplicada = true;
  }
};

// Método para gerar sugestões inteligentes
transacaoSchema.methods.gerarSugestaesInteligentes = async function() {
  const CategorizacaoService = require('../services/CategorizacaoInteligenteService');
  
  try {
    const sugestoes = await CategorizacaoService.gerarSugestoes(
      this.descricao,
      this.valor,
      this.empresa,
      this.contaBancaria
    );
    
    // Converter nomes de categoria para IDs se necessário
    const Categoria = require('./Categoria');
    const sugestoesComId = [];
    
    for (const sugestao of sugestoes) {
      const categoria = await Categoria.findOne({
        nome: sugestao.categoria,
        $or: [
          { empresa: this.empresa },
          { padrao: true }
        ],
        ativa: true
      });
      
      if (categoria) {
        sugestoesComId.push({
          categoria: categoria._id,
          confianca: sugestao.confianca,
          motivo: sugestao.motivo,
          fontes: sugestao.fontes || ['inteligente']
        });
      }
    }
    
    this.sugestoes = sugestoesComId;
    return sugestoesComId;
    
  } catch (error) {
    console.error('Erro ao gerar sugestões inteligentes:', error);
    return this.gerarSugestaoSimples();
  }
};

// Método de fallback para sugestões simples
transacaoSchema.methods.gerarSugestaoSimples = async function() {
  const Categoria = require('./Categoria');
  
  // Buscar categorias da empresa e padrão
  const categorias = await Categoria.find({
    $or: [
      { empresa: this.empresa },
      { padrao: true }
    ],
    ativa: true
  });

  const descricaoLower = this.descricao.toLowerCase();
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

    // Análise adicional baseada em padrões básicos
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
        motivo,
        fontes: ['basico']
      });
    }
  }

  // Ordenar por confiança
  return sugestoes.sort((a, b) => b.confianca - a.confianca).slice(0, 3);
};

// Método para aplicar categorização e registrar no histórico
transacaoSchema.methods.aplicarCategorizacao = async function(categoriaId, usuario = 'sistema', metodo = 'manual') {
  const CategorizacaoService = require('../services/CategorizacaoInteligenteService');
  
  // Registrar no histórico
  if (!this.historicoCategorizacao) {
    this.historicoCategorizacao = [];
  }
  
  this.historicoCategorizacao.push({
    categoria: categoriaId,
    dataCategorizacao: new Date(),
    usuario,
    metodo
  });
  
  // Aplicar categoria
  const categoriaAnterior = this.categoria;
  this.categoria = categoriaId;
  this.status = 'conciliada';
  
  // Aprender com a categorização (se houve sugestão)
  if (this.sugestoes && this.sugestoes.length > 0) {
    const sugestaoAplicada = this.sugestoes.find(s => 
      s.categoria.toString() === categoriaId.toString()
    );
    
    await CategorizacaoService.aprenderComCategorizacao(
      this._id,
      categoriaId,
      sugestaoAplicada
    );
  }
  
  return this.save();
};

// Static method para buscar transações com sugestões
transacaoSchema.statics.buscarComSugestoes = function(filtros = {}) {
  return this.find({
    ...filtros,
    'sugestoes.0': { $exists: true }
  })
  .populate('categoria', 'nome cor tipo')
  .populate('contato', 'nome')
  .populate('sugestoes.categoria', 'nome cor tipo')
  .populate('sugestoes.contato', 'nome')
  .sort({ data: -1 });
};

// Static method para análise de performance das sugestões
transacaoSchema.statics.analisarPerformanceSugestoes = async function(empresaId, periodo = 30) {
  const CategorizacaoService = require('../services/CategorizacaoInteligenteService');
  return await CategorizacaoService.analisarPerformance(empresaId, periodo);
};

module.exports = mongoose.models.Transacao || mongoose.model('Transacao', transacaoSchema);