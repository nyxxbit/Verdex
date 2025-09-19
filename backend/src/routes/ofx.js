// src/routes/ofx.js
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { parse: parseOFX } = require('ofx-js');
const mongoose = require('mongoose');
const Transacao = require('../models/TransacaoAprimorada');
const ContaBancaria = require('../models/ContaBancaria');
const Empresa = require('../models/Empresa');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseOFXDate(dateString) {
    const dateStr = dateString.toString().trim();
    if (dateStr.length < 8) return new Date();
    
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1;
    const day = parseInt(dateStr.substr(6, 2));
    
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

// ALTERAÇÃO: Adicionado o middleware 'upload.single("arquivo")' que estava faltando.
router.post('/upload', upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: true, message: 'Nenhum arquivo foi enviado' });
        }
        let { empresaId, contaBancariaId } = req.body;
        
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ error: true, message: 'Empresa não encontrada' });

        const contaBancaria = await ContaBancaria.findById(contaBancariaId);
        if (!contaBancaria) {
            return res.status(404).json({ error: true, message: `Conta bancária com ID ${contaBancariaId} não encontrada` });
        }

        const ofxContent = req.file.buffer.toString('utf8');
        const ofxData = await parseOFX(ofxContent);
        
        const { transacoes: transacoesOFX, relatorio } = extrairTransacoesOFXComValidacao(ofxData);

        if (transacoesOFX.length === 0) {
            return res.status(400).json({ error: true, message: 'Nenhuma transação encontrada no arquivo OFX' });
        }
        
        const resultadoProcessamento = await processarTransacoesOFXComAuditoria(transacoesOFX, empresaId, contaBancaria, relatorio);

        res.json({
            sucesso: true,
            message: 'Arquivo processado com sucesso!',
            resumo: resultadoProcessamento
        });

    } catch (error) {
        console.error('Erro no processamento OFX:', error);
        res.status(500).json({ error: true, message: 'Erro interno no servidor', detalhes: error.message });
    }
});

function extrairTransacoesOFXComValidacao(ofxData) {
    const stmtrs = ofxData.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
    if (!stmtrs) throw new Error('Estrutura STMTRS não encontrada no OFX.');
    
    const ledgerBal = stmtrs.LEDGERBAL;
    const banktranlist = stmtrs.BANKTRANLIST;
    
    const transacoesRaw = Array.isArray(banktranlist?.STMTTRN) ? banktranlist.STMTTRN : (banktranlist?.STMTTRN ? [banktranlist.STMTTRN] : []);

    const datas = [];
    const relatorio = {
        transacoesEncontradas: transacoesRaw.length,
        saldoFinal: ledgerBal ? parseFloat(ledgerBal.BALAMT.replace(',', '.')) : 0.0,
        dataSaldoFinal: ledgerBal ? parseOFXDate(ledgerBal.DTASOF) : new Date(),
        saldoCalculado: 0.0,
        totalCreditos: 0.0,
        totalDebitos: 0.0,
        quantidadeCreditos: 0,
        quantidadeDebitos: 0,
    };
    
    const transacoesProcessadas = transacoesRaw.map(transacao => {
        const valor = parseFloat(transacao.TRNAMT.replace(',', '.'));
        if (isNaN(valor)) return null;

        const data = parseOFXDate(transacao.DTPOSTED);
        datas.push(data);

        const tipo = valor >= 0 ? 'credito' : 'debito';
        relatorio.saldoCalculado += valor;
        
        if (tipo === 'credito') {
            relatorio.totalCreditos += valor;
            relatorio.quantidadeCreditos++;
        } else {
            relatorio.totalDebitos += Math.abs(valor);
            relatorio.quantidadeDebitos++;
        }

        return {
            fitid: transacao.FITID,
            tipo,
            data,
            valor,
            descricao: (transacao.MEMO || transacao.NAME || `Transação ${transacao.FITID}`).trim(),
        };
    }).filter(Boolean);
    
    if (datas.length > 0) {
        relatorio.dataInicio = new Date(Math.min(...datas.map(d => d.getTime())));
        relatorio.dataFim = new Date(Math.max(...datas.map(d => d.getTime())));
    }
    
    relatorio.saldoInicialCalculado = relatorio.saldoFinal - relatorio.saldoCalculado;
    return { transacoes: transacoesProcessadas, relatorio };
}

async function processarTransacoesOFXComAuditoria(transacoesOFX, empresaId, contaBancaria, relatorioExtracao) {
    const contaBancariaId = contaBancaria._id;

    const fitids = transacoesOFX.map(t => t.fitid);
    const existentes = await Transacao.find({ 'dadosOriginais.fitid': { $in: fitids }, contaBancaria: contaBancariaId });
    const fitidsExistentes = new Set(existentes.map(t => t.dadosOriginais.fitid));
    
    const transacoesParaInserir = transacoesOFX
        .filter(t => !fitidsExistentes.has(t.fitid))
        .map(t => ({
            empresa: empresaId,
            contaBancaria: contaBancariaId,
            data: t.data,
            descricao: t.descricao,
            valor: t.valor,
            tipo: t.tipo,
            origem: 'ofx',
            status: 'pendente',
            dadosOriginais: { fitid: t.fitid }
        }));
        
    if (transacoesParaInserir.length > 0) {
        await Transacao.insertMany(transacoesParaInserir, { ordered: false });
    }

    const dataInicioExtrato = relatorioExtracao.dataInicio;
    
    const transacoesAnteriores = await Transacao.aggregate([
        { $match: { 
            contaBancaria: new mongoose.Types.ObjectId(contaBancariaId), 
            data: { $lt: dataInicioExtrato } 
        }},
        { $group: { _id: null, saldo: { $sum: '$valor' } } }
    ]);
    
    const saldoAnteriorCalculado = transacoesAnteriores[0]?.saldo || 0;
    const saldoInicioExtrato = saldoAnteriorCalculado;
    const saldoFinalCalculado = saldoInicioExtrato + relatorioExtracao.saldoCalculado;

    console.log('\n=== AUDITORIA DE SALDO PROFISSIONAL ===');
    console.log(`💰 Saldo no Início do Extrato (${formatarData(dataInicioExtrato)}): R$ ${saldoInicioExtrato.toFixed(2)}`);
    console.log(`🧮 Saldo Líquido do Extrato Atual: R$ ${relatorioExtracao.saldoCalculado.toFixed(2)}`);
    console.log(`🏦 Saldo Final Calculado (Saldo Inicial + Líquido): R$ ${saldoFinalCalculado.toFixed(2)}`);
    console.log(`🏦 Saldo Final Informado no OFX: R$ ${relatorioExtracao.saldoFinal.toFixed(2)}`);

    return {
        total: transacoesOFX.length,
        novas: transacoesParaInserir.length,
        duplicadas: transacoesOFX.length - transacoesParaInserir.length,
        auditoria: {
            saldoInicioExtrato: saldoInicioExtrato.toFixed(2),
            saldoFinalCalculado: saldoFinalCalculado.toFixed(2),
        }
    };
}

function extrairInfoContaOFX(ofxData) {
    const stmtrs = ofxData.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
    const bankacctfrom = stmtrs?.BANKACCTFROM;
    if (!bankacctfrom) return null;
    return {
        banco: bankacctfrom.BANKID,
        agencia: bankacctfrom.BRANCHID || '0000',
        conta: bankacctfrom.ACCTID,
        tipo: bankacctfrom.ACCTTYPE === 'CHECKING' ? 'corrente' : 'poupanca'
    };
}

function getBancoNome(codigo) {
    const bancos = { '001': 'Banco do Brasil', '237': 'Bradesco', '341': 'Itaú', '104': 'Caixa' };
    return bancos[codigo] || `Banco ${codigo}`;
}

const formatarData = (data) => new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

module.exports = router;