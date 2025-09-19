// Definições de tipos para o sistema

export interface Empresa {
  _id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  plano: {
    tipo: 'teste' | 'basico' | 'pro' | 'enterprise';
    dataInicio: Date;
    dataFim?: Date;
    ativo: boolean;
  };
  configuracoes: {
    moeda: string;
    timezone: string;
    categorizacaoAutomatica: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ContaBancaria {
  _id: string;
  empresa: string | Empresa;
  banco: {
    codigo: string;
    nome: string;
  };
  agencia: string;
  conta: string;
  digito?: string;
  tipo: 'corrente' | 'poupanca' | 'investimento';
  nome: string;
  saldo: number;
  ativa: boolean;
  identificacao?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Categoria {
  _id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone: string;
  padrao: boolean;
  empresa?: string | Empresa;
  ativa: boolean;
  palavrasChave: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type Conta = ContaBancaria;

export interface Contato {
  _id: string;
  empresa: string | Empresa;
  nome: string;
  tipo: 'cliente' | 'fornecedor' | 'funcionario' | 'outro';
  documento?: {
    numero: string;
    tipo: 'cpf' | 'cnpj';
  };
  email?: string;
  telefone?: string;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sugestao {
  categoria?: string | Categoria;
  contato?: string | Contato;
  confianca: number;
  motivo: string;
}

export interface Transacao {
  _id: string;
  empresa: string | Empresa;
  contaBancaria: string | ContaBancaria;
  data: Date;
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
  origem: 'manual' | 'ofx' | 'api';
  status: 'pendente' | 'conciliada' | 'ignorada';
  categoria?: string | Categoria;
  contato?: string | Contato;
  conciliacao?: {
    data: Date;
    usuario: string;
    tipo: 'manual' | 'lote' | 'automatica';
  };
  sugestoes: Sugestao[];
  dadosOriginais?: {
    fitid?: string;
    memo?: string;
    checknum?: string;
  };
  observacoes?: string;
  natureza?: 'receita' | 'despesa';
  createdAt: Date;
  updatedAt: Date;
}

export interface Conciliacao {
  _id: string;
  empresa: string | Empresa;
  contaBancaria: string | ContaBancaria;
  tipo: 'manual' | 'lote' | 'automatica';
  dataInicio: Date;
  dataFim?: Date;
  status: 'em_andamento' | 'concluida' | 'cancelada';
  transacoes: Array<{
    transacao: string | Transacao;
    situacaoAnterior: {
      status: string;
      categoria?: string | Categoria;
      contato?: string | Contato;
    };
    acaoRealizada: 'categorizada' | 'contato_vinculado' | 'ignorada' | 'revertida';
    timestamp: Date;
  }>;
  resumo: {
    totalTransacoes: number;
    transacoesConciliadas: number;
    transacoesIgnoradas: number;
    valorTotal: number;
  };
  usuario: string;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para formulários e filtros
export interface FiltrosTransacao {
  empresa?: string;
  contaBancaria?: string;
  status?: 'todas' | 'desconhecidas' | 'conhecidas' | 'pendente' | 'conciliada' | 'ignorada';
  dataInicio?: string;
  dataFim?: string;
  valorMin?: number;
  valorMax?: number;
  tipo?: 'receita' | 'despesa';
  categoria?: string;
  ordenacao?: 'data' | 'valor' | 'descricao' | 'relevancia';
  ordem?: 'asc' | 'desc';
  pagina?: number;
  limite?: number;
  busca?: string;
}

export interface EstatisticasTransacao {
  totalTransacoes: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoLiquido: number;
  pendentes: number;
}

export interface RespostaListaTransacoes {
  transacoes: Transacao[];
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    paginas: number;
  };
  estatisticas: EstatisticasTransacao;
}

export interface ItemConciliacaoLote {
  transacaoId: string;
  acao: 'conciliar' | 'ignorar';
  categoria?: string;
  contato?: string;
}

export interface DadosConciliacaoLote {
  empresa: string;
  contaBancaria: string;
  transacoes: ItemConciliacaoLote[];
  usuario: string;
  configuracoes?: {
    aplicarSugestoesAutomaticamente?: boolean;
    confiancaMinima?: number;
  };
}

// Tipos para componentes de UI
export interface OptionSelect {
  value: string;
  label: string;
  color?: string;
}

export interface ColunasTabela {
  Header: string;
  accessor: string;
  Cell?: (props: any) => JSX.Element;
  sortable?: boolean;
  width?: string;
}