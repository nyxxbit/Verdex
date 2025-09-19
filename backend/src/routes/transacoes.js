// src/routes/transacoes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Transacao = require('../models/TransacaoAprimorada');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: true, message: 'Dados inválidos', details: errors.array() });
  }
  next();
};

// GET /api/transacoes - Listar transações com filtros
router.get('/', async (req, res) => {
  try {
    const { contaBancaria, status = 'todas', dataInicio, dataFim, categoria, ordenacao = 'data', ordem = 'desc' } = req.query;
    
    const filtros = {};
    if (contaBancaria) filtros.contaBancaria = contaBancaria;
    if (categoria) filtros.categoria = categoria;
    if (status !== 'todas') filtros.status = status === 'desconhecidas' ? 'pendente' : status;
    
    if (dataInicio) {
        filtros.data = filtros.data || {};
        filtros.data.$gte = new Date(dataInicio + 'T00:00:00.000Z');
    }
    if (dataFim) {
        filtros.data = filtros.data || {};
        filtros.data.$lte = new Date(dataFim + 'T23:59:59.999Z');
    }

    const ordenacaoObj = { [ordenacao]: ordem === 'desc' ? -1 : 1 };

    const transacoes = await Transacao.find(filtros).sort(ordenacaoObj);
    
    res.json({ transacoes });
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ error: true, message: 'Erro ao listar transações' });
  }
});


// GET /api/transacoes/saldo-acumulado
router.get('/saldo-acumulado', async (req, res) => {
  try {
    const { contaBancaria, dataInicio, dataFim } = req.query;
    if (!contaBancaria || !dataInicio || !dataFim) {
      return res.status(400).json({ error: true, message: 'Parâmetros obrigatórios ausentes.' });
    }

    const dataInicioDate = new Date(dataInicio + 'T00:00:00.000Z');
    const dataFimDate = new Date(dataFim + 'T23:59:59.999Z');

    const saldoAnteriorResult = await Transacao.aggregate([
      { $match: { contaBancaria: new mongoose.Types.ObjectId(contaBancaria), data: { $lt: dataInicioDate } } },
      { $group: { _id: null, saldoTotal: { $sum: '$valor' } } }
    ]);
    const saldoInicialDoPeriodo = saldoAnteriorResult[0]?.saldoTotal || 0;

    const transacoesNoPeriodo = await Transacao.find({
        contaBancaria,
        data: { $gte: dataInicioDate, $lte: dataFimDate }
    }).sort({ data: 1 }).select('data valor tipo');

    let saldoAcumulado = saldoInicialDoPeriodo;
    const periodosMap = new Map();

    for (const transacao of transacoesNoPeriodo) {
        saldoAcumulado += transacao.valor;
        const chave = transacao.data.toISOString().split('T')[0];
        const diaAtual = periodosMap.get(chave) || {
            periodo: chave, data: transacao.data, saldoAcumulado: 0, valorPeriodo: 0
        };
        diaAtual.saldoAcumulado = saldoAcumulado;
        diaAtual.valorPeriodo += transacao.valor;
        periodosMap.set(chave, diaAtual);
    }

    const saldos = Array.from(periodosMap.values()).sort((a, b) => a.data - b.data);
    const totalCreditos = transacoesNoPeriodo.filter(t => t.tipo === 'credito').reduce((sum, t) => sum + t.valor, 0);
    const totalDebitos = transacoesNoPeriodo.filter(t => t.tipo === 'debito').reduce((sum, t) => sum + Math.abs(t.valor), 0);

    res.json({
        saldos,
        resumo: {
            saldoInicial: saldoInicialDoPeriodo,
            saldoFinal: saldoAcumulado,
            totalCreditos,
            totalDebitos,
            totalTransacoes: transacoesNoPeriodo.length,
        }
    });
  } catch (error) {
    console.error('Erro ao calcular saldo acumulado:', error);
    res.status(500).json({ error: true, message: 'Erro ao calcular saldo acumulado' });
  }
});

// -- ROTAS RESTAURADAS --
// PUT /api/transacoes/:id/aplicar-sugestao
router.put('/:id/aplicar-sugestao', [
    body('indiceSugestao').isInt({ min: 0 }).withMessage('Índice da sugestão inválido')
], handleValidationErrors, async (req, res) => {
    try {
        const { indiceSugestao } = req.body;
        const transacao = await Transacao.findById(req.params.id);
        if (!transacao) {
            return res.status(404).json({ error: true, message: 'Transação não encontrada' });
        }
        if (!transacao.sugestoes || !transacao.sugestoes[indiceSugestao]) {
            return res.status(400).json({ error: true, message: 'Sugestão não encontrada' });
        }

        transacao.aplicarSugestao(indiceSugestao);
        await transacao.save();
        
        await transacao.populate([
            { path: 'categoria', select: 'nome tipo cor' },
            { path: 'contato', select: 'nome tipo' }
        ]);

        res.json(transacao);
    } catch (error) {
        console.error('Erro ao aplicar sugestão:', error);
        res.status(500).json({ error: true, message: 'Erro ao aplicar sugestão' });
    }
});


module.exports = router;