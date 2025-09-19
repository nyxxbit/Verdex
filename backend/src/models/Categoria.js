const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['receita', 'despesa'],
    required: true
  },
  cor: {
    type: String,
    default: '#23a4ce'
  },
  icone: {
    type: String,
    default: 'dollar-sign'
  },
  padrao: {
    type: Boolean,
    default: false
  },
  empresa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: function() {
      return !this.padrao;
    }
  },
  ativa: {
    type: Boolean,
    default: true
  },
  palavrasChave: [{
    type: String,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Índices
categoriaSchema.index({ empresa: 1, tipo: 1 });
categoriaSchema.index({ padrao: 1 });
categoriaSchema.index({ palavrasChave: 1 });

// Categorias padrão que serão criadas automaticamente
categoriaSchema.statics.getCategoriasPadrao = function() {
  return [
    // Receitas
    { nome: 'Receita com serviços', tipo: 'receita', cor: '#1fac4b', padrao: true, palavrasChave: ['servico', 'prestacao', 'consultoria', 'ted', 'transferencia', 'agua'] },
    { nome: 'Venda de produtos', tipo: 'receita', cor: '#2ab9e7', padrao: true, palavrasChave: ['venda', 'produto', 'mercadoria'] },
    { nome: 'Receita financeira', tipo: 'receita', cor: '#6431e2', padrao: true, palavrasChave: ['juros', 'rendimento', 'aplicacao', 'investimento'] },
    { nome: 'Outras receitas', tipo: 'receita', cor: '#ff40b3', padrao: true, palavrasChave: ['receita', 'entrada'] },
    
    // Despesas
    { nome: 'Serviços contratados', tipo: 'despesa', cor: '#e22f36', padrao: true, palavrasChave: ['pix', 'transferencia', 'servico', 'prestacao', 'consultoria', 'fabio', 'eliano', 'fernanda'] },
    { nome: 'Custo serviço prestado', tipo: 'despesa', cor: '#ffc200', padrao: true, palavrasChave: ['custo', 'servico', 'cicero', 'evangelista', 'jose'] },
    { nome: 'Pagamento de empréstimo', tipo: 'despesa', cor: '#313336', padrao: true, palavrasChave: ['emprestimo', 'financiamento', 'capital', 'giro', 'operacao'] },
    { nome: 'Tarifa bancária', tipo: 'despesa', cor: '#969799', padrao: true, palavrasChave: ['tarifa', 'taxa', 'anuidade', 'bancaria', 'qr', 'code', 'cef'] },
    { nome: 'Aluguel e condomínio', tipo: 'despesa', cor: '#787a7b', padrao: true, palavrasChave: ['aluguel', 'condominio', 'locacao', 'valfer'] },
    { nome: 'Custos produto vendido', tipo: 'despesa', cor: '#b4b5b6', padrao: true, palavrasChave: ['custo', 'produto', 'mercadoria', 'krepischi'] },
    { nome: 'Despesas financeiras', tipo: 'despesa', cor: '#5a5c5e', padrao: true, palavrasChave: ['despesa', 'financeira', 'juros', 'aplicacao'] },
    { nome: 'Outras despesas', tipo: 'despesa', cor: '#c3c4c4', padrao: true, palavrasChave: ['despesa', 'gasto', 'outros', 'graziela', 'antonio', 'rosimar'] }
  ];
};

module.exports = mongoose.models.Categoria || mongoose.model('Categoria', categoriaSchema);