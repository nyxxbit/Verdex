// src/routes/dashboard.js
const express = require('express');
const mongoose = require('mongoose');
const Transacao = require('../models/TransacaoAprimorada');

const router = express.Router();

// GET /api/dashboard/resumo?contaBancariaId=...&dataInicio=...&dataFim=...
router.get('/resumo', async (req, res) => {
    try {
        const { contaBancariaId, dataInicio, dataFim } = req.query;

        if (!contaBancariaId || !dataInicio || !dataFim) {
            return res.status(400).json({ error: true, message: 'Parâmetros obrigatórios ausentes.' });
        }

        const dataInicioDate = new Date(dataInicio + 'T00:00:00.000Z');
        const dataFimDate = new Date(dataFim + 'T23:59:59.999Z');

        // 1. Saldo Inicial (antes do período)
        const saldoAnteriorResult = await Transacao.aggregate([
            { $match: { contaBancaria: new mongoose.Types.ObjectId(contaBancariaId), data: { $lt: dataInicioDate } } },
            { $group: { _id: null, saldoTotal: { $sum: '$valor' } } }
        ]);
        const saldoInicial = saldoAnteriorResult[0]?.saldoTotal || 0;

        // 2. Transações no período
        const transacoes = await Transacao.find({
            contaBancaria: contaBancariaId,
            data: { $gte: dataInicioDate, $lte: dataFimDate }
        }).populate('categoria', 'nome cor').sort({ data: 1 });

        // 3. Cálculos para os cards de resumo
        const totalCreditos = transacoes.filter(t => t.tipo === 'credito').reduce((sum, t) => sum + t.valor, 0);
        const totalDebitos = transacoes.filter(t => t.tipo === 'debito').reduce((sum, t) => sum + Math.abs(t.valor), 0);
        const saldoFinal = saldoInicial + totalCreditos - totalDebitos;

        // 4. Dados para o gráfico de linha (Evolução do Saldo)
        const saldoDiarioMap = new Map();
        let saldoCorrente = saldoInicial;
        for (const t of transacoes) {
            const dia = t.data.toISOString().split('T')[0];
            saldoCorrente += t.valor;
            saldoDiarioMap.set(dia, saldoCorrente);
        }
        const saldoDiario = Array.from(saldoDiarioMap, ([data, saldo]) => ({ data, saldo }));

        // 5. Dados para os gráficos de pizza
        const agruparPorCategoria = (tipo) => {
            const mapa = new Map();
            transacoes
                .filter(t => t.tipo === tipo && t.categoria)
                .forEach(t => {
                    const nomeCategoria = t.categoria.nome;
                    const valorAtual = mapa.get(nomeCategoria) || 0;
                    mapa.set(nomeCategoria, valorAtual + Math.abs(t.valor));
                });
            return Array.from(mapa, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        };
        
        const despesasPorCategoria = agruparPorCategoria('debito');
        const receitasPorCategoria = agruparPorCategoria('credito');

        res.json({
            resumoCards: {
                saldoFinal,
                totalCreditos,
                totalDebitos,
            },
            saldoDiario,
            despesasPorCategoria,
            receitasPorCategoria
        });

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ error: true, message: 'Erro ao buscar dados do dashboard' });
    }
});

module.exports = router;