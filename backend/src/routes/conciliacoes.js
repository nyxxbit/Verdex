const express = require('express');
const { body, validationResult } = require('express-validator');
const Conciliacao = require('../models/Conciliacao');
const Transacao = require('../models/Transacao');

const router = express.Router();

// POST /api/conciliacoes/lote - Iniciar conciliação em lote
router.post('/lote', [
  body('empresa').isMongoId().withMessage('Empresa inválida'),
  body('contaBancaria').isMongoId().withMessage('Conta bancária inválida'),
  body('transacoes').isArray().withMessage('Lista de transações é obrigatória'),
  body('usuario').notEmpty().withMessage('Usuário é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, details: errors.array() });
    }

    const { empresa, contaBancaria, transacoes, usuario, configuracoes } = req.body;

    // Criar nova conciliação em lote
    const conciliacao = new Conciliacao({
      empresa,
      contaBancaria,
      tipo: 'lote',
      dataInicio: new Date(),
      usuario,
      configuracoes: configuracoes || {}
    });

    // Processar cada transação
    for (const item of transacoes) {
      const transacao = await Transacao.findById(item.transacaoId);
      if (!transacao) continue;

      const situacaoAnterior = {
        status: transacao.status,
        categoria: transacao.categoria,
        contato: transacao.contato
      };

      // Aplicar mudanças
      if (item.categoria) transacao.categoria = item.categoria;
      if (item.contato) transacao.contato = item.contato;
      if (item.acao === 'conciliar') {
        transacao.status = 'conciliada';
        transacao.conciliacao = {
          data: new Date(),
          tipo: 'lote'
        };
      } else if (item.acao === 'ignorar') {
        transacao.status = 'ignorada';
      }

      await transacao.save();
      conciliacao.adicionarTransacao(transacao, item.acao, situacaoAnterior);
    }

    conciliacao.finalizar();
    await conciliacao.save();

    res.status(201).json({
      message: 'Conciliação em lote realizada com sucesso',
      conciliacao
    });
  } catch (error) {
    console.error('Erro na conciliação em lote:', error);
    res.status(500).json({ error: true, message: 'Erro na conciliação em lote' });
  }
});

// GET /api/conciliacoes - Listar histórico de conciliações
router.get('/', async (req, res) => {
  try {
    const { empresa, contaBancaria } = req.query;
    
    const filtros = {};
    if (empresa) filtros.empresa = empresa;
    if (contaBancaria) filtros.contaBancaria = contaBancaria;
    
    const conciliacoes = await Conciliacao.find(filtros)
      .populate('empresa', 'nome')
      .populate('contaBancaria', 'nome banco agencia conta')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(conciliacoes);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao listar conciliações' });
  }
});

module.exports = router;