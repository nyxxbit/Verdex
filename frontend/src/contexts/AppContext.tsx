// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from 'react';
import { Empresa, Conta } from '@/types';
import { empresaService, contaBancariaService } from '@/services';

// 1. Definir o formato do estado compartilhado
interface AppState {
  empresas: Empresa[];
  contas: Conta[];
  empresaSelecionada: string;
  contaSelecionada: string;
  loading: boolean;
}

// 2. Definir as ações que podem modificar o estado
type Action =
  | { type: 'SET_DATA_INICIAL'; payload: { empresas: Empresa[], contas: Conta[] } }
  | { type: 'SELECIONAR_EMPRESA'; payload: string }
  | { type: 'SELECIONAR_CONTA'; payload: string }
  | { type: 'SET_CONTAS'; payload: Conta[] }
  | { type: 'ADD_EMPRESA'; payload: Empresa }
  | { type: 'ADD_CONTA'; payload: Conta }
  | { type: 'SET_LOADING'; payload: boolean };

// 3. Estado Inicial
const initialState: AppState = {
  empresas: [],
  contas: [],
  empresaSelecionada: '',
  contaSelecionada: '',
  loading: true,
};

// 4. A função Reducer que gerencia as mudanças de estado
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_DATA_INICIAL':
      const primeiraEmpresaId = action.payload.empresas[0]?._id || '';
      const primeirasContas = action.payload.contas;
      return {
        ...state,
        empresas: action.payload.empresas,
        contas: primeirasContas,
        empresaSelecionada: primeiraEmpresaId,
        contaSelecionada: primeirasContas[0]?._id || '',
        loading: false,
      };
    case 'SELECIONAR_EMPRESA':
      return { ...state, empresaSelecionada: action.payload, contas: [], contaSelecionada: '' }; // Limpa contas ao trocar de empresa
    case 'SET_CONTAS':
      return {
        ...state,
        contas: action.payload,
        contaSelecionada: action.payload[0]?._id || '',
      };
    case 'SELECIONAR_CONTA':
      return { ...state, contaSelecionada: action.payload };
    case 'ADD_EMPRESA':
        return {
            ...state,
            empresas: [...state.empresas, action.payload],
            empresaSelecionada: action.payload._id,
        };
    case 'ADD_CONTA':
        return {
            ...state,
            contas: [...state.contas, action.payload],
            contaSelecionada: action.payload._id,
        };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

// 5. Criar o Contexto
const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

// 6. Criar o "Provedor" que vai envolver sua aplicação
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Efeito para carregar empresas na inicialização
  useEffect(() => {
    const buscarDadosIniciais = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const listaEmpresas = await empresaService.listar();
            let listaContas: Conta[] = [];
            if (listaEmpresas.length > 0) {
                listaContas = await contaBancariaService.listar(listaEmpresas[0]._id);
            }
            dispatch({ type: 'SET_DATA_INICIAL', payload: { empresas: listaEmpresas, contas: listaContas }});
        } catch (error) {
            console.error("Erro ao buscar dados iniciais", error);
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };
    buscarDadosIniciais();
  }, []);

  // Efeito para buscar contas quando a empresa selecionada muda
  useEffect(() => {
    if (!state.empresaSelecionada || state.empresas.length === 0) return;

    const buscarContas = async () => {
        try {
            const listaContas = await contaBancariaService.listar(state.empresaSelecionada);
            dispatch({ type: 'SET_CONTAS', payload: listaContas });
        } catch (error) {
            console.error("Erro ao buscar contas da empresa selecionada", error);
        }
    };
    buscarContas();
  }, [state.empresaSelecionada]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// 7. Criar um hook customizado para facilitar o uso do contexto
export const useAppContext = () => {
  return useContext(AppContext);
};