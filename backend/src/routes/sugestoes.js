const express = require('express');
const router = express.Router();
const Transacao = require('../models/Transacao');
const TransacaoAprimorada = require('../models/TransacaoAprimorada');
const CategorizacaoService = require('../services/CategorizacaoInteligenteService');
const auth = require('../middleware/auth');

// GET /api/sugestoes/:transacaoId - Gerar sugestões para uma transação
router.get('/:transacaoId', auth.authenticateToken, async (req, res) => {
  try {
    const { transacaoId } = req.params;
    const { forcar = false } = req.query;
    
    const transacao = await Transacao.findById(transacaoId);
    if (!transacao) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    // Verificar se a empresa pertence ao usuário
    if (transacao.empresa.toString() !== req.user.empresa.toString()) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    // Se já tem sugestões e não foi forçado, retornar as existentes
    if (transacao.sugestoes && transacao.sugestoes.length > 0 && !forcar) {
      return res.json({
        transacaoId,
        sugestoes: transacao.sugestoes,
        geradoEm: transacao.sugestoes[0]?.criadaEm || transacao.updatedAt
      });
    }
    
    // Gerar novas sugestões
    const sugestoes = await CategorizacaoService.gerarSugestoes(
      transacao.descricao,
      transacao.valor,
      transacao.empresa,
      transacao.contaBancaria
    );
    
    // Salvar sugestões na transação
    const sugestoesFormatadas = sugestoes.map(s => ({
      categoria: s.categoria,
      confianca: s.confianca,
      motivo: s.motivo,
      fontes: s.fontes || ['inteligente'],
      criadaEm: new Date()
    }));
    
    transacao.sugestoes = sugestoesFormatadas;
    await transacao.save();
    
    res.json({
      transacaoId,
      sugestoes: sugestoesFormatadas,
      geradoEm: new Date()
    });
    
  } catch (error) {
    console.error('Erro ao gerar sugestões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sugestoes/lote - Gerar sugestões em lote
router.post('/lote', auth.authenticateToken, async (req, res) => {
  try {
    const { transacaoIds, forcar = false } = req.body;
    
    if (!Array.isArray(transacaoIds) || transacaoIds.length === 0) {
      return res.status(400).json({ error: 'IDs de transações inválidos' });
    }
    
    const transacoes = await Transacao.find({
      _id: { $in: transacaoIds },
      empresa: req.user.empresa
    });
    
    if (transacoes.length !== transacaoIds.length) {
      return res.status(404).json({ error: 'Algumas transações não foram encontradas' });
    }
    
    const resultados = [];
    const erros = [];
    
    // Processar cada transação
    for (const transacao of transacoes) {
      try {
        // Pular se já tem sugestões e não foi forçado
        if (transacao.sugestoes && transacao.sugestoes.length > 0 && !forcar) {
          resultados.push({
            transacaoId: transacao._id,
            status: 'ja_possui_sugestoes',
            sugestoes: transacao.sugestoes
          });
          continue;
        }
        
        // Gerar sugestões
        const sugestoes = await CategorizacaoService.gerarSugestoes(
          transacao.descricao,
          transacao.valor,
          transacao.empresa,
          transacao.contaBancaria
        );
        
        // Salvar sugestões
        const sugestoesFormatadas = sugestoes.map(s => ({
          categoria: s.categoria,
          confianca: s.confianca,
          motivo: s.motivo,
          fontes: s.fontes || ['inteligente'],
          criadaEm: new Date()
        }));
        
        transacao.sugestoes = sugestoesFormatadas;
        await transacao.save();
        
        resultados.push({
          transacaoId: transacao._id,
          status: 'sugestoes_geradas',
          sugestoes: sugestoesFormatadas
        });
        
      } catch (error) {
        erros.push({
          transacaoId: transacao._id,
          erro: error.message
        });
      }
    }
    
    res.json({
      processadas: resultados.length,
      erros: erros.length,
      resultados,
      erros
    });
    
  } catch (error) {
    console.error('Erro no processamento em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sugestoes/:transacaoId/aplicar - Aplicar uma sugestão
router.post('/:transacaoId/aplicar', auth.authenticateToken, async (req, res) => {
  try {
    const { transacaoId } = req.params;
    const { sugestaoIndex, categoriaId } = req.body;
    
    const transacao = await Transacao.findById(transacaoId);
    if (!transacao) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    // Verificar autorização
    if (transacao.empresa.toString() !== req.user.empresa.toString()) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    let sugestaoAplicada = null;
    
    if (sugestaoIndex !== undefined) {
      // Aplicar sugestão por índice
      const sugestao = transacao.sugestoes[sugestaoIndex];
      if (!sugestao) {
        return res.status(400).json({ error: 'Índice de sugestão inválido' });
      }
      
      transacao.categoria = sugestao.categoria;
      if (sugestao.contato) {
        transacao.contato = sugestao.contato;
      }
      sugestao.aplicada = true;
      sugestaoAplicada = sugestao;
      
    } else if (categoriaId) {
      // Aplicar categoria específica
      transacao.categoria = categoriaId;
      
      // Marcar sugestão correspondente como aplicada
      const sugestaoCorrespondente = transacao.sugestoes.find(s => 
        s.categoria.toString() === categoriaId.toString()
      );
      if (sugestaoCorrespondente) {
        sugestaoCorrespondente.aplicada = true;
        sugestaoAplicada = sugestaoCorrespondente;
      }
    } else {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    
    // Atualizar status e conciliação
    transacao.status = 'conciliada';
    transacao.conciliacao = {
      data: new Date(),
      usuario: req.user.nome || req.user.email,
      tipo: 'automatica'
    };
    
    await transacao.save();
    
    // Aprender com a categorização
    if (sugestaoAplicada) {
      await CategorizacaoService.aprenderComCategorizacao(
        transacao._id,
        transacao.categoria,
        sugestaoAplicada
      );
    }
    
    // Retornar transação atualizada
    const transacaoAtualizada = await Transacao.findById(transacaoId)
      .populate('categoria', 'nome cor tipo')
      .populate('contato', 'nome');
    
    res.json({
      message: 'Sugestão aplicada com sucesso',
      transacao: transacaoAtualizada
    });
    
  } catch (error) {
    console.error('Erro ao aplicar sugestão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sugestoes/performance/:empresaId - Análise de performance das sugestões
router.get('/performance/:empresaId', auth.authenticateToken, async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { periodo = 30 } = req.query;
    
    // Verificar autorização
    if (empresaId !== req.user.empresa.toString()) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    const performance = await CategorizacaoService.analisarPerformance(
      empresaId, 
      parseInt(periodo)
    );
    
    if (!performance) {
      return res.status(404).json({ error: 'Dados de performance não encontrados' });
    }
    
    res.json(performance);
    
  } catch (error) {
    console.error('Erro ao analisar performance:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/sugestoes/:transacaoId - Limpar sugestões de uma transação
router.delete('/:transacaoId', auth.authenticateToken, async (req, res) => {
  try {
    const { transacaoId } = req.params;
    
    const transacao = await Transacao.findById(transacaoId);
    if (!transacao) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    // Verificar autorização
    if (transacao.empresa.toString() !== req.user.empresa.toString()) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    transacao.sugestoes = [];
    await transacao.save();
    
    res.json({ message: 'Sugestões removidas com sucesso' });
    
  } catch (error) {
    console.error('Erro ao remover sugestões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sugestoes/auto-aplicar - Auto-aplicar sugestões com alta confiança
router.post('/auto-aplicar', auth.authenticateToken, async (req, res) => {
  try {
    const { limiteConfianca = 85, empresaId } = req.body;
    
    if (!empresaId || empresaId !== req.user.empresa.toString()) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    // Buscar transações pendentes com sugestões de alta confiança
    const transacoes = await Transacao.find({
      empresa: empresaId,
      status: 'pendente',
      'sugestoes.confianca': { $gte: limiteConfianca },
      'sugestoes.aplicada': false
    });
    
    const resultados = [];
    const erros = [];
    
    for (const transacao of transacoes) {
      try {
        // Encontrar sugestão com maior confiança acima do limite
        const melhorSugestao = transacao.sugestoes
          .filter(s => s.confianca >= limiteConfianca && !s.aplicada)
          .sort((a, b) => b.confianca - a.confianca)[0];
        
        if (melhorSugestao) {
          // Aplicar sugestão
          transacao.categoria = melhorSugestao.categoria;
          if (melhorSugestao.contato) {
            transacao.contato = melhorSugestao.contato;
          }
          
          melhorSugestao.aplicada = true;
          transacao.status = 'conciliada';
          transacao.conciliacao = {
            data: new Date(),
            usuario: 'sistema-auto',
            tipo: 'automatica'
          };
          
          await transacao.save();
          
          // Aprender com a categorização
          await CategorizacaoService.aprenderComCategorizacao(
            transacao._id,
            transacao.categoria,
            melhorSugestao
          );
          
          resultados.push({
            transacaoId: transacao._id,
            categoria: melhorSugestao.categoria,
            confianca: melhorSugestao.confianca,
            motivo: melhorSugestao.motivo
          });
        }
        
      } catch (error) {
        erros.push({
          transacaoId: transacao._id,
          erro: error.message
        });
      }
    }
    
    res.json({
      message: `${resultados.length} transações categorizadas automaticamente`,
      aplicadas: resultados.length,
      erros: erros.length,
      resultados,
      erros
    });
    
  } catch (error) {
    console.error('Erro na auto-aplicação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;