const mongoose = require('mongoose');
const Transacao = require('../models/Transacao');
const Categoria = require('../models/Categoria');

class CategorizacaoInteligenteService {
  constructor() {
    // Padrões de análise de texto para categorização
    this.padroesAnalise = {
      // Receitas
      receitas: [
        {
          palavras: ['ted', 'transferencia', 'elet', 'dispon', 'remet', 'empresa', 'aguas'],
          categoria: 'Receita com serviços',
          confianca: 85,
          contexto: 'TED/transferência de empresa cliente'
        },
        {
          palavras: ['pix', 'rem:', 'cemiterio', 'jardim'],
          categoria: 'Receita com serviços',
          confianca: 80,
          contexto: 'PIX recebido de cliente'
        },
        {
          palavras: ['rentab', 'invest', 'facilcred', 'rendimento'],
          categoria: 'Receita financeira',
          confianca: 90,
          contexto: 'Rendimento de investimento'
        }
      ],
      
      // Despesas
      despesas: [
        {
          palavras: ['pix', 'des:', 'transferencia'],
          categoria: 'Serviços contratados',
          confianca: 70,
          contexto: 'PIX para prestador de serviços',
          nomes: ['fabio', 'eliano', 'fernanda', 'romulo', 'sildete', 'maria', 'robson', 'wagner']
        },
        {
          palavras: ['operacao', 'capital', 'giro', 'contr', 'parc'],
          categoria: 'Pagamento de empréstimo',
          confianca: 95,
          contexto: 'Parcela de empréstimo'
        },
        {
          palavras: ['tarifa', 'bancaria', 'cesta', 'cartao', 'credito', 'anuidade'],
          categoria: 'Tarifa bancária',
          confianca: 95,
          contexto: 'Taxa bancária'
        },
        {
          palavras: ['pix', 'qr', 'code', 'dinamico', 'cef', 'matriz'],
          categoria: 'Tarifa bancária',
          confianca: 85,
          contexto: 'Taxa de PIX QR Code'
        },
        {
          palavras: ['pagto', 'eletron', 'cobranca', 'seguro'],
          categoria: 'Serviços contratados',
          confianca: 80,
          contexto: 'Pagamento de seguro'
        },
        {
          palavras: ['aplic', 'invest', 'facil'],
          categoria: 'Despesas financeiras',
          confianca: 85,
          contexto: 'Aplicação financeira'
        },
        {
          palavras: ['locacao', 'aluguel', 'valfer'],
          categoria: 'Aluguel e condomínio',
          confianca: 90,
          contexto: 'Pagamento de aluguel/locação'
        }
      ]
    };

    // Nomes comuns que indicam tipos de transação
    this.nomesClassificacao = {
      prestadoresServico: [
        'fabio', 'eliano', 'fernanda', 'romulo', 'sildete', 'maria', 'robson', 'wagner',
        'cicero', 'evangelista', 'jose', 'antonio', 'arilson', 'derlice', 'dozina',
        'eliane', 'felizardo', 'francisco', 'fagner', 'ranilson', 'cristiana'
      ],
      empresasClientes: [
        'empresa', 'aguas', 'cemiterio', 'jardim', 'macchione'
      ],
      fornecedores: [
        'krepischi', 'hipershow', 'original', 'auto', 'center', 'maninho', 'viagens'
      ]
    };
  }

  /**
   * Gera sugestões inteligentes para uma transação
   */
  async gerarSugestoes(descricao, valor, empresaId, contaBancariaId) {
    try {
      const descricaoLimpa = this.limparTexto(descricao);
      const isReceita = valor > 0;
      
      // Análise baseada em padrões
      const sugestoesPadroes = this.analisarPorPadroes(descricaoLimpa, isReceita);
      
      // Análise baseada em histórico
      const sugestoesHistorico = await this.analisarPorHistorico(
        descricaoLimpa, empresaId, contaBancariaId, isReceita
      );
      
      // Análise por similaridade textual
      const sugestoesSimilaridade = await this.analisarPorSimilaridade(
        descricaoLimpa, empresaId, isReceita
      );
      
      // Combinar e rankear sugestões
      const sugestoesCombinadas = this.combinarSugestoes([
        ...sugestoesPadroes,
        ...sugestoesHistorico,
        ...sugestoesSimilaridade
      ]);
      
      return sugestoesCombinadas.slice(0, 3); // Top 3 sugestões
      
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      return [];
    }
  }

  /**
   * Limpa e normaliza o texto para análise
   */
  limparTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();
  }

  /**
   * Analisa transação baseada em padrões pré-definidos
   */
  analisarPorPadroes(descricao, isReceita) {
    const padroes = isReceita ? this.padroesAnalise.receitas : this.padroesAnalise.despesas;
    const sugestoes = [];

    for (const padrao of padroes) {
      let pontuacao = 0;
      let palavrasEncontradas = [];

      // Verificar palavras-chave
      for (const palavra of padrao.palavras) {
        if (descricao.includes(palavra)) {
          pontuacao += 20;
          palavrasEncontradas.push(palavra);
        }
      }

      // Verificar nomes específicos (se aplicável)
      if (padrao.nomes) {
        for (const nome of padrao.nomes) {
          if (descricao.includes(nome)) {
            pontuacao += 15;
            palavrasEncontradas.push(nome);
          }
        }
      }

      // Bonificação por múltiplas palavras encontradas
      if (palavrasEncontradas.length > 1) {
        pontuacao += palavrasEncontradas.length * 5;
      }

      if (pontuacao > 15) {
        sugestoes.push({
          categoria: padrao.categoria,
          confianca: Math.min(pontuacao + padrao.confianca - 70, 95),
          motivo: `${padrao.contexto}. Palavras: ${palavrasEncontradas.join(', ')}`,
          fonte: 'padroes'
        });
      }
    }

    return sugestoes;
  }

  /**
   * Analisa baseado no histórico de transações similares
   */
  async analisarPorHistorico(descricao, empresaId, contaBancariaId, isReceita) {
    try {
      // Buscar transações similares já categorizadas
      const transacoesSimilares = await Transacao.find({
        empresa: empresaId,
        status: 'conciliada',
        categoria: { $exists: true },
        valor: isReceita ? { $gt: 0 } : { $lt: 0 },
        $text: { $search: descricao }
      })
      .populate('categoria', 'nome tipo')
      .limit(10)
      .sort({ score: { $meta: 'textScore' } });

      const sugestoes = [];
      const categoriaCount = {};

      // Contar frequência de cada categoria
      for (const transacao of transacoesSimilares) {
        if (transacao.categoria) {
          const categoriaId = transacao.categoria._id.toString();
          const categoriaNome = transacao.categoria.nome;
          
          if (!categoriaCount[categoriaId]) {
            categoriaCount[categoriaId] = {
              categoria: categoriaNome,
              count: 0,
              similaridade: 0
            };
          }
          
          categoriaCount[categoriaId].count++;
          categoriaCount[categoriaId].similaridade += transacao.score || 1;
        }
      }

      // Gerar sugestões baseadas na frequência
      for (const [categoriaId, dados] of Object.entries(categoriaCount)) {
        const confianca = Math.min(
          (dados.count * 10) + (dados.similaridade * 5) + 30,
          90
        );

        if (confianca > 40) {
          sugestoes.push({
            categoria: dados.categoria,
            confianca,
            motivo: `Baseado em ${dados.count} transação(ões) similar(es) já categorizada(s)`,
            fonte: 'historico'
          });
        }
      }

      return sugestoes;
      
    } catch (error) {
      console.error('Erro na análise por histórico:', error);
      return [];
    }
  }

  /**
   * Analisa por similaridade textual usando algoritmos simples
   */
  async analisarPorSimilaridade(descricao, empresaId, isReceita) {
    try {
      // Buscar transações recentes categorizadas
      const transacoesRecentes = await Transacao.find({
        empresa: empresaId,
        status: 'conciliada',
        categoria: { $exists: true },
        valor: isReceita ? { $gt: 0 } : { $lt: 0 },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Últimos 90 dias
      })
      .populate('categoria', 'nome tipo')
      .limit(50);

      const sugestoes = [];
      const similaridades = {};

      for (const transacao of transacoesRecentes) {
        const similaridade = this.calcularSimilaridadeTexto(
          descricao, 
          this.limparTexto(transacao.descricao)
        );

        if (similaridade > 0.6) { // 60% de similaridade
          const categoriaId = transacao.categoria._id.toString();
          const categoriaNome = transacao.categoria.nome;
          
          if (!similaridades[categoriaId]) {
            similaridades[categoriaId] = {
              categoria: categoriaNome,
              maxSimilaridade: similaridade,
              count: 0
            };
          }
          
          similaridades[categoriaId].maxSimilaridade = Math.max(
            similaridades[categoriaId].maxSimilaridade,
            similaridade
          );
          similaridades[categoriaId].count++;
        }
      }

      // Gerar sugestões baseadas na similaridade
      for (const [categoriaId, dados] of Object.entries(similaridades)) {
        const confianca = Math.min(
          (dados.maxSimilaridade * 50) + (dados.count * 5) + 25,
          85
        );

        if (confianca > 50) {
          sugestoes.push({
            categoria: dados.categoria,
            confianca,
            motivo: `${Math.round(dados.maxSimilaridade * 100)}% similar a transações anteriores`,
            fonte: 'similaridade'
          });
        }
      }

      return sugestoes;
      
    } catch (error) {
      console.error('Erro na análise por similaridade:', error);
      return [];
    }
  }

  /**
   * Calcula similaridade entre dois textos usando distância de Jaccard
   */
  calcularSimilaridadeTexto(texto1, texto2) {
    const palavras1 = new Set(texto1.split(' ').filter(p => p.length > 2));
    const palavras2 = new Set(texto2.split(' ').filter(p => p.length > 2));
    
    const intersecao = new Set([...palavras1].filter(p => palavras2.has(p)));
    const uniao = new Set([...palavras1, ...palavras2]);
    
    return uniao.size === 0 ? 0 : intersecao.size / uniao.size;
  }

  /**
   * Combina e rankeia sugestões de diferentes fontes
   */
  combinarSugestoes(sugestoes) {
    const categoriasMap = {};

    // Agrupar por categoria
    for (const sugestao of sugestoes) {
      const categoria = sugestao.categoria;
      
      if (!categoriasMap[categoria]) {
        categoriasMap[categoria] = {
          categoria,
          confiancaTotal: 0,
          contadorFontes: 0,
          motivos: [],
          fontes: new Set()
        };
      }
      
      categoriasMap[categoria].confiancaTotal += sugestao.confianca;
      categoriasMap[categoria].contadorFontes++;
      categoriasMap[categoria].motivos.push(sugestao.motivo);
      categoriasMap[categoria].fontes.add(sugestao.fonte);
    }

    // Calcular confiança final e criar resultado
    const resultado = [];
    
    for (const dados of Object.values(categoriasMap)) {
      // Média ponderada com bônus por múltiplas fontes
      const confiancaMedia = dados.confiancaTotal / dados.contadorFontes;
      const bonusMultiplasFontes = dados.fontes.size > 1 ? 10 : 0;
      const confiancaFinal = Math.min(confiancaMedia + bonusMultiplasFontes, 95);
      
      resultado.push({
        categoria: dados.categoria,
        confianca: Math.round(confiancaFinal),
        motivo: dados.motivos[0], // Pegar o primeiro motivo
        fontes: Array.from(dados.fontes)
      });
    }

    // Ordenar por confiança
    return resultado.sort((a, b) => b.confianca - a.confianca);
  }

  /**
   * Aprende com novas categorizações para melhorar sugestões futuras
   */
  async aprenderComCategorizacao(transacaoId, categoriaEscolhida, sugestaoAplicada = null) {
    try {
      // Log para análise futura de acertos/erros
      console.log(`Aprendizado: Transação ${transacaoId} categorizada como ${categoriaEscolhida}`);
      
      if (sugestaoAplicada) {
        console.log(`Sugestão aplicada com ${sugestaoAplicada.confianca}% de confiança`);
      }
      
      // Aqui poderia implementar machine learning mais avançado
      // Por exemplo, ajustar pesos dos padrões baseado no feedback
      
    } catch (error) {
      console.error('Erro no aprendizado:', error);
    }
  }

  /**
   * Analisa performance das sugestões
   */
  async analisarPerformance(empresaId, periodo = 30) {
    try {
      const dataInicio = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000);
      
      const transacoes = await Transacao.find({
        empresa: empresaId,
        createdAt: { $gte: dataInicio },
        status: 'conciliada',
        'sugestoes.0': { $exists: true } // Tinha pelo menos uma sugestão
      });

      let acertos = 0;
      let total = transacoes.length;

      for (const transacao of transacoes) {
        // Verificar se a primeira sugestão foi a categoria escolhida
        if (transacao.sugestoes[0] && 
            transacao.categoria && 
            transacao.sugestoes[0].categoria.toString() === transacao.categoria.toString()) {
          acertos++;
        }
      }

      const precisao = total > 0 ? (acertos / total) * 100 : 0;
      
      console.log(`Performance das sugestões: ${precisao.toFixed(1)}% de acerto (${acertos}/${total})`);
      
      return {
        periodo,
        total,
        acertos,
        precisao: Math.round(precisao * 10) / 10
      };
      
    } catch (error) {
      console.error('Erro na análise de performance:', error);
      return null;
    }
  }
}

module.exports = new CategorizacaoInteligenteService();