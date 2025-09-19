import api from './api';

export interface SugestaoInteligente {
  categoria: string;
  confianca: number;
  motivo: string;
  fontes?: string[];
  aplicada?: boolean;
  criadaEm?: string;
}

export interface ResultadoSugestoes {
  transacaoId: string;
  sugestoes: SugestaoInteligente[];
  geradoEm: string;
}

export interface ResultadoLote {
  processadas: number;
  totalErros: number;
  resultados: {
    transacaoId: string;
    status: string;
    sugestoes: SugestaoInteligente[];
  }[];
  erros: {
    transacaoId: string;
    erro: string;
  }[];
}

export interface PerformanceSugestoes {
  periodo: number;
  total: number;
  acertos: number;
  precisao: number;
}

class SugestoesService {
  /**
   * Gera sugestões para uma transação específica
   */
  async gerarSugestoes(transacaoId: string, forcar = false): Promise<ResultadoSugestoes> {
    try {
      const response = await api.get(`/sugestoes/${transacaoId}`, {
        params: { forcar }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      throw error;
    }
  }

  /**
   * Gera sugestões em lote para múltiplas transações
   */
  async gerarSugestoesLote(transacaoIds: string[], forcar = false): Promise<ResultadoLote> {
    try {
      const response = await api.post('/sugestoes/lote', {
        transacaoIds,
        forcar
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar sugestões em lote:', error);
      throw error;
    }
  }

  /**
   * Aplica uma sugestão específica
   */
  async aplicarSugestao(transacaoId: string, sugestaoIndex: number): Promise<any> {
    try {
      const response = await api.post(`/sugestoes/${transacaoId}/aplicar`, {
        sugestaoIndex
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar sugestão:', error);
      throw error;
    }
  }

  /**
   * Aplica uma categoria específica (não necessariamente uma sugestão)
   */
  async aplicarCategoria(transacaoId: string, categoriaId: string): Promise<any> {
    try {
      const response = await api.post(`/sugestoes/${transacaoId}/aplicar`, {
        categoriaId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar categoria:', error);
      throw error;
    }
  }

  /**
   * Remove todas as sugestões de uma transação
   */
  async limparSugestoes(transacaoId: string): Promise<void> {
    try {
      await api.delete(`/sugestoes/${transacaoId}`);
    } catch (error) {
      console.error('Erro ao limpar sugestões:', error);
      throw error;
    }
  }

  /**
   * Auto-aplica sugestões com alta confiança
   */
  async autoAplicarSugestoes(empresaId: string, limiteConfianca = 85): Promise<any> {
    try {
      const response = await api.post('/sugestoes/auto-aplicar', {
        empresaId,
        limiteConfianca
      });
      return response.data;
    } catch (error) {
      console.error('Erro na auto-aplicação:', error);
      throw error;
    }
  }

  /**
   * Obtém análise de performance das sugestões
   */
  async obterPerformance(empresaId: string, periodo = 30): Promise<PerformanceSugestoes> {
    try {
      const response = await api.get(`/sugestoes/performance/${empresaId}`, {
        params: { periodo }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter performance:', error);
      throw error;
    }
  }

  /**
   * Gera sugestões para transações pendentes em massa
   */
  async processarTransacoesPendentes(empresaId: string, limite = 50): Promise<ResultadoLote> {
    try {
      // Primeiro, buscar transações pendentes
      const transacoesPendentes = await api.get('/transacoes', {
        params: {
          empresa: empresaId,
          status: 'pendente',
          limite,
          semCategoria: true
        }
      });

      const transacaoIds = transacoesPendentes.data.map((t: any) => t._id);
      
      if (transacaoIds.length === 0) {
        return {
          processadas: 0,
          totalErros: 0,
          resultados: [],
          erros: []
        };
      }

      // Gerar sugestões em lote
      return await this.gerarSugestoesLote(transacaoIds);
      
    } catch (error) {
      console.error('Erro ao processar transações pendentes:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas das sugestões
   */
  async obterEstatisticas(empresaId: string) {
    try {
      const [performance, transacoes] = await Promise.all([
        this.obterPerformance(empresaId),
        api.get('/transacoes', {
          params: {
            empresa: empresaId,
            comSugestoes: true,
            limite: 1000
          }
        })
      ]);

      const transacoesComSugestoes = transacoes.data;
      
      // Calcular estatísticas
      const totalComSugestoes = transacoesComSugestoes.length;
      const aplicadas = transacoesComSugestoes.filter((t: any) => 
        t.sugestoes?.some((s: any) => s.aplicada)
      ).length;
      
      const sugestoesAltoConfianca = transacoesComSugestoes.filter((t: any) => 
        t.sugestoes?.some((s: any) => s.confianca >= 80)
      ).length;

      const distribuicaoFontes = transacoesComSugestoes.reduce((acc: any, t: any) => {
        t.sugestoes?.forEach((s: any) => {
          s.fontes?.forEach((fonte: string) => {
            acc[fonte] = (acc[fonte] || 0) + 1;
          });
        });
        return acc;
      }, {});

      return {
        performance,
        estatisticas: {
          totalComSugestoes,
          aplicadas,
          sugestoesAltoConfianca,
          taxaAplicacao: totalComSugestoes > 0 ? (aplicadas / totalComSugestoes) * 100 : 0,
          distribuicaoFontes
        }
      };
      
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Treina o sistema com feedback do usuário
   */
  async enviarFeedback(transacaoId: string, sugestaoIndex: number, feedback: 'positivo' | 'negativo', motivo?: string) {
    try {
      // Por enquanto, apenas log local (pode ser expandido para API)
      console.log('Feedback enviado:', {
        transacaoId,
        sugestaoIndex,
        feedback,
        motivo,
        timestamp: new Date().toISOString()
      });
      
      // Aqui poderia enviar para uma API de feedback
      // await api.post(`/sugestoes/${transacaoId}/feedback`, {
      //   sugestaoIndex,
      //   feedback,
      //   motivo
      // });
      
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      throw error;
    }
  }
}

export default new SugestoesService();