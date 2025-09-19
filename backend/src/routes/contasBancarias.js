// src/routes/contasBancarias.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const ContaBancaria = require('../models/ContaBancaria');
const Transacao = require('../models/TransacaoAprimorada');

const router = express.Router();

// GET /api/contas - Listar contas bancárias
router.get('/', async (req, res) => {
    try {
        const { empresa } = req.query;
        const filtros = empresa ? { empresa } : {};
        const contas = await ContaBancaria.find(filtros)
            .populate('empresa', 'nome cnpj')
            .select('-__v');
        res.json(contas);
    } catch (error) {
        res.status(500).json({ error: true, message: 'Erro ao listar contas' });
    }
});

// POST /api/contas - Criar conta bancária com saldo inicial
router.post('/', [
    body('empresa').isMongoId(),
    body('banco.codigo').notEmpty(),
    body('banco.nome').notEmpty(),
    body('agencia').notEmpty(),
    body('conta').notEmpty(),
    body('tipo').isIn(['corrente', 'poupanca', 'investimento']),
    body('nome').notEmpty(),
    // ALTERAÇÃO: Validação dos novos campos
    body('saldoInicial').isNumeric().withMessage('Saldo inicial deve ser um número'),
    body('dataSaldoInicial').isISO8601().toDate().withMessage('Data do saldo inicial é inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: true, details: errors.array() });
        }

        const { saldoInicial, dataSaldoInicial, ...contaData } = req.body;
        
        // 1. Criar a conta bancária
        const novaConta = new ContaBancaria({
            ...contaData,
            saldoInicial: parseFloat(saldoInicial),
            dataSaldoInicial: new Date(dataSaldoInicial)
        });
        await novaConta.save();

        // 2. Criar uma transação de "Saldo Inicial" para refletir no extrato
        // Esta transação representa o ponto de partida do saldo
        if (parseFloat(saldoInicial) !== 0) {
            const transacaoSaldoInicial = new Transacao({
                empresa: novaConta.empresa,
                contaBancaria: novaConta._id,
                data: new Date(dataSaldoInicial),
                descricao: 'Saldo Inicial',
                valor: parseFloat(saldoInicial),
                tipo: parseFloat(saldoInicial) >= 0 ? 'credito' : 'debito',
                origem: 'manual',
                status: 'conciliada'
            });
            await transacaoSaldoInicial.save();
        }

        res.status(201).json(novaConta);
    } catch (error) {
        console.error("Erro ao criar conta:", error);
        res.status(500).json({ error: true, message: 'Erro ao criar conta' });
    }
});

module.exports = router;