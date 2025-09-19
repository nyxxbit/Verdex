// src/reducers/conciliacaoReducer.ts
import { Transacao, Categoria, Conta, Empresa } from '@/types';

// Define o formato do nosso estado
export interface ConciliacaoState {
  empresas: Empresa[];
  contas: Conta[];
  transacoes: Transacao[];
  categorias: Categoria[];
  empresaSelecionada: string;
  contaSelecionada: string;
  loading: {
    inicial: boolean;
    contas: boolean;
    transacoes: boolean;
    importando: boolean;
  };
  modals: {
    empresa: boolean;
    conta: boolean;
  };
}

// Define o estado inicial da página
export const initialState: ConciliacaoState = {
  empresas: [],
  contas: [],
  transacoes: [],
  categorias: [],
  empresaSelecionada: '',
  contaSelecionada: '',
  loading: {
    inicial: true,
    contas: false,
    transacoes: false,
    importando: false,
  },
  modals: {
    empresa: false,
    conta: false,
  },
};

// Define as ações que podem alterar o estado
type Action =
  | { type: 'SET_DATA_INICIAL'; payload: { empresas: Empresa[]; categorias: Categoria[] } }
  | { type: 'SET_EMPRESAS'; payload: Empresa[] }
  | { type: 'SET_CONTAS'; payload: Conta[] }
  | { type: 'SET_TRANSACOES'; payload: Transacao[] }
  | { type: 'SELECIONAR_EMPRESA'; payload: string }
  | { type: 'SELECIONAR_CONTA'; payload: string }
  | { type: 'SET_LOADING'; payload: { tipo: keyof ConciliacaoState['loading']; valor: boolean } }
  | { type: 'TOGGLE_MODAL'; payload: { modal: keyof ConciliacaoState['modals']; valor: boolean } }
  | { type: 'ADD_EMPRESA'; payload: Empresa }
  | { type: 'ADD_CONTA'; payload: Conta };

// A função reducer que aplica as mudanças de estado
export function conciliacaoReducer(state: ConciliacaoState, action: Action): ConciliacaoState {
  switch (action.type) {
    case 'SET_DATA_INICIAL':
      const primeiraEmpresaId = action.payload.empresas[0]?._id || '';
      return {
        ...state,
        empresas: action.payload.empresas,
        categorias: action.payload.categorias,
        empresaSelecionada: primeiraEmpresaId,
        loading: { ...state.loading, inicial: false },
      };
    case 'SET_EMPRESAS':
      return { ...state, empresas: action.payload };
    case 'SET_CONTAS':
      const primeiraContaId = action.payload[0]?._id || '';
      return {
        ...state,
        contas: action.payload,
        contaSelecionada: primeiraContaId,
      };
    case 'SET_TRANSACOES':
      return { ...state, transacoes: action.payload };
    case 'SELECIONAR_EMPRESA':
      return { ...state, empresaSelecionada: action.payload };
    case 'SELECIONAR_CONTA':
      return { ...state, contaSelecionada: action.payload };
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.tipo]: action.payload.valor },
      };
    case 'TOGGLE_MODAL':
      return {
        ...state,
        modals: { ...state.modals, [action.payload.modal]: action.payload.valor },
      };
    case 'ADD_EMPRESA':
        const novasEmpresas = [...state.empresas, action.payload];
        return {
            ...state,
            empresas: novasEmpresas,
            empresaSelecionada: action.payload._id,
            modals: { empresa: false, conta: true } // Fecha modal de empresa, abre o de conta
        }
    case 'ADD_CONTA':
        const novasContas = [...state.contas, action.payload];
        return {
            ...state,
            contas: novasContas,
            contaSelecionada: action.payload._id,
            modals: { ...state.modals, conta: false }
        }
    default:
      return state;
  }
}