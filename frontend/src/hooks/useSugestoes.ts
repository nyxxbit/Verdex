import React, { useState, useCallback, useEffect } from 'react';
import sugestoesService, { SugestaoInteligente, ResultadoSugestoes } from '../services/sugestoes';
import { toast } from 'react-toastify';

interface UseSugestoesProps {
  transacaoId?: string;
  empresaId?: string;
  autoCarregar?: boolean;
}

interface UseSugestoesReturn {
  sugestoes: SugestaoInteligente[];
  carregando: boolean;
  erro: string | null;
  gerarSugestoes: (forcar?: boolean) => Promise<void>;
  aplicarSugestao: (index: number) => Promise<void>;
  aplicarCategoria: (categoriaId: string) => Promise<void>;
  limparSugestoes: () => Promise<void>;
  recarregar: () => Promise<void>;
  ultimaAtualizacao: Date | null;
}

export const useSugestoes = ({ 
  transacaoId, 
  empresaId, 
  autoCarregar = false 
}: UseSugestoesProps = {}): UseSugestoesReturn => {
  const [sugestoes, setSugestoes] = useState<SugestaoInteligente[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const gerarSugestoes = useCallback(async (forcar = false) => {
    if (!transacaoId) {
      setErro('ID da transação não fornecido');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const resultado = await sugestoesService.gerarSugestoes(transacaoId, forcar);
      setSugestoes(resultado.sugestoes);
      setUltimaAtualizacao(new Date(resultado.geradoEm));
      
      if (resultado.sugestoes.length > 0) {
        toast.success(`${resultado.sugestoes.length} sugestão(ões) gerada(s)!`);
      } else {
        toast.info('Nenhuma sugestão encontrada para esta transação');
      }
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao gerar sugestões';
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }, [transacaoId]);

  const aplicarSugestao = useCallback(async (index: number) => {
    if (!transacaoId) {
      throw new Error('ID da transação não fornecido');
    }

    if (index < 0 || index >= sugestoes.length) {
      throw new Error('Índice de sugestão inválido');
    }

    try {
      await sugestoesService.aplicarSugestao(transacaoId, index);
      
      // Atualizar sugestões localmente
      const novasSugestoes = [...sugestoes];
      novasSugestoes[index].aplicada = true;
      setSugestoes(novasSugestoes);
      
      toast.success('Sugestão aplicada com sucesso!');
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao aplicar sugestão';
      toast.error(mensagemErro);
      throw error;
    }
  }, [transacaoId, sugestoes]);

  const aplicarCategoria = useCallback(async (categoriaId: string) => {
    if (!transacaoId) {
      throw new Error('ID da transação não fornecido');
    }

    try {
      await sugestoesService.aplicarCategoria(transacaoId, categoriaId);
      
      // Marcar sugestão correspondente como aplicada
      const novasSugestoes = sugestoes.map((s: SugestaoInteligente) => ({
        ...s,
        aplicada: s.categoria === categoriaId ? true : s.aplicada
      }));
      setSugestoes(novasSugestoes);
      
      toast.success('Categoria aplicada com sucesso!');
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao aplicar categoria';
      toast.error(mensagemErro);
      throw error;
    }
  }, [transacaoId, sugestoes]);

  const limparSugestoes = useCallback(async () => {
    if (!transacaoId) {
      throw new Error('ID da transação não fornecido');
    }

    try {
      await sugestoesService.limparSugestoes(transacaoId);
      setSugestoes([]);
      setUltimaAtualizacao(null);
      toast.success('Sugestões removidas');
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao limpar sugestões';
      toast.error(mensagemErro);
      throw error;
    }
  }, [transacaoId]);

  const recarregar = useCallback(async () => {
    await gerarSugestoes(true);
  }, [gerarSugestoes]);

  // Auto-carregar sugestões se solicitado
  useEffect(() => {
    if (autoCarregar && transacaoId) {
      gerarSugestoes();
    }
  }, [autoCarregar, transacaoId, gerarSugestoes]);

  return {
    sugestoes,
    carregando,
    erro,
    gerarSugestoes,
    aplicarSugestao,
    aplicarCategoria,
    limparSugestoes,
    recarregar,
    ultimaAtualizacao
  };
};

// Hook para processamento em lote
interface UseSugestoesLoteReturn {
  processarLote: (transacaoIds: string[], forcar?: boolean) => Promise<void>;
  autoAplicar: (limiteConfianca?: number) => Promise<void>;
  processarPendentes: (limite?: number) => Promise<void>;
  carregando: boolean;
  erro: string | null;
  resultado: any;
}

export const useSugestoesLote = (empresaId: string): UseSugestoesLoteReturn => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);

  const processarLote = useCallback(async (transacaoIds: string[], forcar = false) => {
    setCarregando(true);
    setErro(null);

    try {
      const resultado = await sugestoesService.gerarSugestoesLote(transacaoIds, forcar);
      setResultado(resultado);
      
      toast.success(
        `Processadas ${resultado.processadas} transações. ` +
        `${resultado.totalErros} erros.`
      );
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro no processamento em lote';
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }, []);

  const autoAplicar = useCallback(async (limiteConfianca = 85) => {
    setCarregando(true);
    setErro(null);

    try {
      const resultado = await sugestoesService.autoAplicarSugestoes(empresaId, limiteConfianca);
      setResultado(resultado);
      
      toast.success(
        `${resultado.aplicadas} transações categorizadas automaticamente!`
      );
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro na auto-aplicação';
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  const processarPendentes = useCallback(async (limite = 50) => {
    setCarregando(true);
    setErro(null);

    try {
      const resultado = await sugestoesService.processarTransacoesPendentes(empresaId, limite);
      setResultado(resultado);
      
      toast.success(
        `${resultado.processadas} transações pendentes processadas!`
      );
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao processar pendentes';
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  return {
    processarLote,
    autoAplicar,
    processarPendentes,
    carregando,
    erro,
    resultado
  };
};

// Hook para estatísticas
interface UseEstatisticasSugestoesReturn {
  estatisticas: any;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

export const useEstatisticasSugestoes = (empresaId: string): UseEstatisticasSugestoesReturn => {
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEstatisticas = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const dados = await sugestoesService.obterEstatisticas(empresaId);
      setEstatisticas(dados);
    } catch (error: any) {
      const mensagemErro = error.response?.data?.error || 'Erro ao carregar estatísticas';
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  const recarregar = useCallback(async () => {
    await carregarEstatisticas();
  }, [carregarEstatisticas]);

  useEffect(() => {
    if (empresaId) {
      carregarEstatisticas();
    }
  }, [empresaId, carregarEstatisticas]);

  return {
    estatisticas,
    carregando,
    erro,
    recarregar
  };
};