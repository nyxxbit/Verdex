// src/services/index.ts
import api from './api';
import { Transacao, FiltrosTransacao, RespostaListaTransacoes, Conta, Empresa, Contato } from '@/types';

export const transacaoService = {
  async listar(filtros: Partial<FiltrosTransacao> = {}): Promise<RespostaListaTransacoes> {
    const response = await api.get('/transacoes', { params: filtros });
    return response.data;
  },
  async aplicarSugestao(id: string, indiceSugestao: number): Promise<Transacao> {
    const response = await api.put(`/transacoes/${id}/aplicar-sugestao`, { indiceSugestao });
    return response.data;
  },
  async obterSaldoAcumulado(filtros: any) {
    const response = await api.get('/transacoes/saldo-acumulado', { params: filtros });
    return response.data;
  }
};
export const ofxService = {
  async importar(arquivo: File, empresaId: string, contaBancariaId: string) {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('empresaId', empresaId);
    formData.append('contaBancariaId', contaBancariaId);
    const response = await api.post('/ofx/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return response.data;
  }
};
export const categoriaService = {
  async listar(filtros: { empresa?: string; tipo?: 'receita' | 'despesa' } = {}) {
    const response = await api.get('/categorias', { params: filtros });
    return response.data;
  }
};

export const contatoService = {
  async listar(filtros: { empresa?: string; tipo?: string; } = {}): Promise<Contato[]> {
    const response = await api.get('/contatos', { params: filtros });
    return response.data;
  },
  async criar(dados: Partial<Contato>): Promise<Contato> {
    const response = await api.post('/contatos', dados);
    return response.data;
  }
};

export const contaBancariaService = {
  async listar(empresa?: string): Promise<Conta[]> {
    const response = await api.get('/contas', { params: { empresa } });
    return response.data;
  },
  async criar(dados: any): Promise<Conta> {
    const response = await api.post('/contas', dados);
    return response.data;
  }
};
export const empresaService = {
  async listar(): Promise<Empresa[]> {
    const response = await api.get('/empresas');
    return response.data;
  },
  async criar(dados: Partial<Empresa>): Promise<Empresa> {
    const response = await api.post('/empresas', dados);
    return response.data;
  }
};

// NOVO: Serviço para a página de Resumo/Dashboard
export const dashboardService = {
  async getResumo(filtros: { contaBancariaId: string; dataInicio: string; dataFim: string; }) {
    const { contaBancariaId, ...params } = filtros;
    const response = await api.get(`/dashboard/resumo`, { params: { contaBancariaId, ...params }});
    return response.data;
  }
};


export const obraService = {
    async listar(empresaId: string): Promise<any[]> {
        const response = await api.get('/obras', { params: { empresaId } });
        return response.data;
    },
    async criar(dados: any): Promise<any> {
        const response = await api.post('/obras', dados);
        return response.data;
    }
};