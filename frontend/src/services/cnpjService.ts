// src/services/cnpjService.ts
import api from './api';

export interface DadosEmpresaCNPJ {
  nome: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}

export const cnpjService = {
  async consultar(cnpj: string): Promise<DadosEmpresaCNPJ> {
    const response = await api.get(`/cnpj/${cnpj}`);
    return response.data;
  }
};