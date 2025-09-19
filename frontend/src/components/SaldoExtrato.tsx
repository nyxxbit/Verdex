// src/components/SaldoExtrato.tsx
import React, { useState, useEffect, FC, memo, useReducer, useCallback, useMemo } from 'react';
import { transacaoService } from '../services';
import styles from '@/styles/SaldoExtrato.module.css';
import { Transacao } from '@/types';
import { FaChevronDown, FaPaperPlane } from 'react-icons/fa';
import { FaPix } from 'react-icons/fa6';

interface SaldoExtratoProps {
  empresaId?: string;
  contaBancariaId?: string;
}
interface SaldoPeriodo {
  periodo: string;
  saldoAcumulado: number;
  valorPeriodo: number;
  data: Date;
}
interface ResumoSaldo {
  saldoFinal: number;
  totalCreditos: number;
  totalDebitos: number;
  totalTransacoes: number;
  saldoInicial?: number;
}
interface SaldoState {
  saldos: SaldoPeriodo[];
  resumo: ResumoSaldo | null;
  loading: boolean;
  diasAbertos: Set<string>;
  transacoesDoDia: Record<string, Transacao[]>;
  loadingDia: string | null;
  extratoVisivel: boolean;
}

const gerarMesesAnteriores = () => {
  const meses = [];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    meses.push(`${ano}-${mes}`);
  }
  return meses;
};

const saldoInitialState: SaldoState = {
    saldos: [],
    resumo: null,
    loading: true,
    diasAbertos: new Set<string>(),
    transacoesDoDia: {},
    loadingDia: null,
    extratoVisivel: false,
};

function saldoReducer(state: SaldoState, action: any): SaldoState {
    switch (action.type) {
        case 'START_LOADING':
            return { ...state, loading: true, extratoVisivel: false, diasAbertos: new Set() };
        case 'SET_DATA':
            return { ...state, loading: false, saldos: action.payload.saldos, resumo: action.payload.resumo };
        case 'TOGGLE_EXTRATO':
            return { ...state, extratoVisivel: !state.extratoVisivel };
        case 'TOGGLE_DIA':
            const novosDias = new Set(state.diasAbertos);
            if (novosDias.has(action.payload)) {
                novosDias.delete(action.payload);
            } else {
                novosDias.add(action.payload);
            }
            return { ...state, diasAbertos: novosDias };
        case 'SET_LOADING_DIA':
            return { ...state, loadingDia: action.payload };
        case 'SET_TRANSACOES_DIA':
            return { ...state, transacoesDoDia: { ...state.transacoesDoDia, [action.payload.periodo]: action.payload.transacoes }, loadingDia: null };
        default:
            return state;
    }
}

const SaldoExtrato: FC<SaldoExtratoProps> = ({ empresaId, contaBancariaId }) => {
    const [state, dispatch] = useReducer(saldoReducer, saldoInitialState);
    const { saldos, resumo, loading, diasAbertos, transacoesDoDia, loadingDia, extratoVisivel } = state;
    const [mesSelecionado, setMesSelecionado] = useState<string>(() => gerarMesesAnteriores()[0]);

    const mesesDisponiveis = useMemo(() => gerarMesesAnteriores(), []);

    const carregarSaldos = useCallback(async () => {
        if (!contaBancariaId) {
            dispatch({ type: 'SET_DATA', payload: { saldos: [], resumo: null } });
            return;
        }
        dispatch({ type: 'START_LOADING' });
        try {
            const [ano, mes] = mesSelecionado.split('-').map(Number);
            const dataInicio = new Date(ano, mes - 1, 1);
            const dataFim = new Date(ano, mes, 0);
            const filtros = {
                groupBy: 'dia',
                dataInicio: dataInicio.toISOString().split('T')[0],
                dataFim: dataFim.toISOString().split('T')[0],
                empresaId,
                contaBancaria: contaBancariaId
            };
            const dados = await transacaoService.obterSaldoAcumulado(filtros);
            dispatch({ type: 'SET_DATA', payload: { saldos: dados.saldos || [], resumo: dados.resumo || null } });
        } catch (error) {
            console.error('Erro ao carregar saldos:', error);
            dispatch({ type: 'SET_DATA', payload: { saldos: [], resumo: null } });
        }
    }, [mesSelecionado, contaBancariaId, empresaId]);
    
    useEffect(() => {
        carregarSaldos();
    }, [carregarSaldos]);

    const toggleDia = useCallback(async (periodo: string) => {
        dispatch({ type: 'TOGGLE_DIA', payload: periodo });
        const diaJaCarregado = state.transacoesDoDia[periodo];
        const estaAbrindo = !state.diasAbertos.has(periodo);

        if (estaAbrindo && !diaJaCarregado) {
            dispatch({ type: 'SET_LOADING_DIA', payload: periodo });
            try {
                const resultado = await transacaoService.listar({ contaBancaria: contaBancariaId, dataInicio: periodo, dataFim: periodo });
                dispatch({ type: 'SET_TRANSACOES_DIA', payload: { periodo, transacoes: resultado.transacoes } });
            } catch (error) {
                console.error(`Erro ao buscar transações para ${periodo}:`, error);
                dispatch({ type: 'SET_LOADING_DIA', payload: null });
            }
        }
    }, [contaBancariaId, state.diasAbertos, state.transacoesDoDia]);

    const formatarValor = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    
    // CORREÇÃO: Função de formatar data agora trata o fuso horário explicitamente
    const formatarData = (dataInput: string | Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'UTC' 
        }).format(new Date(dataInput));
    };

    if (loading) { return <div className={styles.loading}>Carregando...</div>; }
    if (!resumo) { return <div className={styles.emptyState}>Selecione uma conta para ver o extrato.</div>; }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Saldo & Extrato</h2>
                <select className={styles.periodSelector} value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
                    {mesesDisponiveis.map(mes => (
                        <option key={mes} value={mes}>
                            {new Date(mes + '-02T12:00:00Z').toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.resumoGrid}>
                <div className={styles.resumoItem}>
                    <p className={styles.resumoLabel}>Saldo Final do Mês</p>
                    <p className={styles.resumoValor}>{formatarValor(resumo.saldoFinal)}</p>
                </div>
                <div className={styles.resumoItem}>
                    <p className={styles.resumoLabel}>Créditos no Mês</p>
                    <p className={styles.resumoValor} style={{ color: 'var(--bs-success)' }}>{formatarValor(resumo.totalCreditos)}</p>
                </div>
                <div className={styles.resumoItem}>
                    <p className={styles.resumoLabel}>Débitos no Mês</p>
                    <p className={styles.resumoValor} style={{ color: 'var(--bs-danger)' }}>{formatarValor(resumo.totalDebitos)}</p>
                </div>
            </div>

            <button className={styles.toggleExtratoButton} onClick={() => dispatch({ type: 'TOGGLE_EXTRATO' })}>
                <span>{extratoVisivel ? 'Ocultar' : 'Ver'} Extrato Detalhado</span>
                <FaChevronDown className={`${styles.setaToggle} ${extratoVisivel ? styles.aberto : ''}`} />
            </button>
            
            <div className={`${styles.extratoWrapper} ${extratoVisivel ? styles.visivel : ''}`}>
                <div className={styles.extratoWrapperContent}>
                    <div className={styles.extratoHeader}>
                        <div></div>
                        <div>Data</div>
                        <div style={{ textAlign: 'right' }}>Movimentação do Dia</div>
                        <div style={{ textAlign: 'right' }}>Saldo Acumulado</div>
                    </div>
                    <div>
                        {typeof resumo.saldoInicial === 'number' && (
                            <div className={styles.extratoItem} style={{ fontStyle: 'italic', color: 'var(--bs-gray-700)', cursor: 'default' }}>
                                <div></div>
                                <div className={styles.data}>Saldo do mês anterior</div>
                                <div></div>
                                <div className={styles.saldoDia}>{formatarValor(resumo.saldoInicial)}</div>
                            </div>
                        )}
                        
                        {saldos.map((saldo: SaldoPeriodo, index: number) => {
                            const aberto = diasAbertos.has(saldo.periodo);
                            const tipoMovimentacao = saldo.valorPeriodo > 0 ? 'positivo' : saldo.valorPeriodo < 0 ? 'negativo' : 'neutro';
                            return (
                                <React.Fragment key={index}>
                                    <div className={styles.extratoItem} onClick={() => toggleDia(saldo.periodo)}>
                                        <FaChevronDown className={`${styles.setaDropdown} ${aberto ? styles.aberto : ''}`} />
                                        <div className={styles.data}>{formatarData(saldo.periodo)}</div>
                                        <div className={`${styles.movimentacao} ${styles[tipoMovimentacao]}`}>
                                            {saldo.valorPeriodo !== 0 && (saldo.valorPeriodo > 0 ? '+' : '')}
                                            {formatarValor(saldo.valorPeriodo)}
                                        </div>
                                        <div className={styles.saldoDia}>{formatarValor(saldo.saldoAcumulado)}</div>
                                    </div>
                                    {aberto && (
                                        <div className={styles.detalhesTransacoes}>
                                            {loadingDia === saldo.periodo ? (
                                                <div className={styles.loading}>Carregando...</div>
                                            ) : (
                                                transacoesDoDia[saldo.periodo]?.map((t: Transacao) => {
                                                    const descricaoUpper = t.descricao.toUpperCase();
                                                    return (
                                                        <div key={t._id} className={styles.transacaoDetalheItem}>
                                                            <div className={styles.transacaoInfo}>
                                                                <span className={styles.transacaoData}>{formatarData(t.data)}</span>
                                                                <div className={styles.transacaoDescricao}>
                                                                    {descricaoUpper.includes('PIX') && <FaPix className={`${styles.transactionIcon} ${styles.pix}`} title="Transação PIX"/>}
                                                                    {descricaoUpper.includes('TED') && <FaPaperPlane className={`${styles.transactionIcon} ${styles.ted}`} title="Transação TED"/>}
                                                                    <span>{t.descricao}</span>
                                                                </div>
                                                            </div>
                                                            <span className={`${styles.transacaoValor} ${styles[t.tipo === 'credito' ? 'positivo' : 'negativo']}`}>
                                                                {formatarValor(t.valor)}
                                                            </span>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {saldos.length === 0 && (
                            <div className={styles.emptyState}>Nenhuma transação neste mês.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(SaldoExtrato);