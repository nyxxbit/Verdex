// src/pages/conciliacao.tsx
import React, { FC, useReducer, useCallback, useEffect } from 'react';
import Layout from '@/components/Layout';
import SaldoExtrato from '@/components/SaldoExtrato';
import SugestaesInteligentes from '@/components/SugestaesInteligentes';
import ModalNovaEmpresa from '@/components/ModalNovaEmpresa';
import ModalNovaConta from '@/components/ModalNovaConta';
import { transacaoService, categoriaService, ofxService, contaBancariaService, empresaService } from '@/services';
import { Transacao, Conta, Empresa } from '@/types';
import styles from '@/styles/conciliacao.module.css';
import { conciliacaoReducer, initialState } from '@/reducers/conciliacaoReducer';
import { FaPix } from 'react-icons/fa6';
import { FaPaperPlane } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ConciliacaoPage: FC = () => {
  const [state, dispatch] = useReducer(conciliacaoReducer, initialState);
  const { empresas, contas, transacoes, empresaSelecionada, contaSelecionada, loading, modals } = state;
  const router = useRouter();

  useEffect(() => {
    const buscarDadosIniciais = async () => {
      dispatch({ type: 'SET_LOADING', payload: { tipo: 'inicial', valor: true } });
      try {
        const [listaEmpresas, listaCategorias] = await Promise.all([
          empresaService.listar(),
          categoriaService.listar()
        ]);
        dispatch({ type: 'SET_DATA_INICIAL', payload: { empresas: listaEmpresas, categorias: listaCategorias } });
      } catch (error) {
        console.error("Erro ao buscar dados iniciais", error);
        dispatch({ type: 'SET_LOADING', payload: { tipo: 'inicial', valor: false } });
      }
    };
    buscarDadosIniciais();
  }, []);

  useEffect(() => {
    if (!empresaSelecionada) {
        dispatch({ type: 'SET_CONTAS', payload: [] });
        return;
    };
    const buscarContas = async () => {
      dispatch({ type: 'SET_LOADING', payload: { tipo: 'contas', valor: true } });
      try {
        const listaContas = await contaBancariaService.listar(empresaSelecionada);
        dispatch({ type: 'SET_CONTAS', payload: listaContas });
      } catch (error) {
        console.error("Erro ao buscar contas", error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { tipo: 'contas', valor: false } });
      }
    };
    buscarContas();
  }, [empresaSelecionada]);
  
  const carregarTransacoes = useCallback(async () => {
    if (!contaSelecionada) {
      dispatch({ type: 'SET_TRANSACOES', payload: [] });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: { tipo: 'transacoes', valor: true } });
    try {
      const transacoesData = await transacaoService.listar({ contaBancaria: contaSelecionada });
      dispatch({ type: 'SET_TRANSACOES', payload: transacoesData.transacoes || [] });
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { tipo: 'transacoes', valor: false } });
    }
  }, [contaSelecionada]);

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

  const handleImportarOFX = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contaSelecionada) return;
    dispatch({ type: 'SET_LOADING', payload: { tipo: 'importando', valor: true } });
    try {
      await ofxService.importar(file, empresaSelecionada, contaSelecionada);
      alert('Arquivo importado com sucesso!');
      await carregarTransacoes();
    } catch (error) {
      console.error('Erro ao importar OFX:', error);
      alert('Erro ao importar arquivo OFX.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { tipo: 'importando', valor: false } });
      if(event.target) event.target.value = '';
    }
  }, [empresaSelecionada, contaSelecionada, carregarTransacoes]);
  
  const aplicarSugestao = useCallback(async (transacaoId: string, indiceSugestao: number) => {
    try {
        const transacaoAtualizada = await transacaoService.aplicarSugestao(transacaoId, indiceSugestao);
        const novasTransacoes = transacoes.map(t => t._id === transacaoId ? transacaoAtualizada : t);
        dispatch({ type: 'SET_TRANSACOES', payload: novasTransacoes });
    } catch (error) {
        console.error('Erro ao aplicar sugestão:', error);
    }
  }, [transacoes]);

  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  
  const formatarData = (dataInput: string | Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'UTC' 
    }).format(new Date(dataInput));
  };

  const handleEmpresaCriada = (novaEmpresa: Empresa) => {
    dispatch({ type: 'ADD_EMPRESA', payload: novaEmpresa });
  };

  const handleContaCriada = (novaConta: Conta) => {
    dispatch({ type: 'ADD_CONTA', payload: novaConta });
  };

  if (loading.inicial) {
    return <Layout title="Conciliação Bancária"><div className={styles.loadingState}><div className={styles.spinner}></div><p>Carregando...</p></div></Layout>;
  }

  return (
    <Layout title="Contas & Extratos - Verde Flux">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Gestão de Caixa</h1>
        <div className={styles.headerActions}>
           <input type="file" id="ofx-file-header" accept=".ofx,.OFX" style={{ display: 'none' }} onChange={handleImportarOFX} />
            <button className={styles.btnSecondary} onClick={() => document.getElementById('ofx-file-header')?.click()} disabled={!contaSelecionada || loading.importando}>
              {loading.importando ? 'Importando...' : 'Importar OFX'}
            </button>
            {empresas.length > 0 
              ? <button className={styles.btnPrimary} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'conta', valor: true } })}>+ Nova Conta</button>
              : <button className={styles.btnPrimary} onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'empresa', valor: true } })}>+ Cadastrar Empresa</button>
            }
        </div>
      </div>
      
      <nav className={styles.tabs}>
        <Link href="/resumo" legacyBehavior><a className={router.pathname === '/resumo' ? `${styles.tab} ${styles.active}` : styles.tab}>Resumo</a></Link>
        <Link href="/conciliacao" legacyBehavior><a className={router.pathname === '/conciliacao' ? `${styles.tab} ${styles.active}` : styles.tab}>Contas & Extratos</a></Link>
        <Link href="#" legacyBehavior><a className={styles.tab}>Fluxo de caixa</a></Link>
      </nav>
      
      <div className={styles.gridContainer}>
        <main className={styles.mainContent}>
            <section className={styles.contentSection}>
               <SaldoExtrato contaBancariaId={contaSelecionada} empresaId={empresaSelecionada} />
            </section>
            <section className={styles.contentSection}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Movimentações para Conciliar</h2></div>
              <div className={styles.sectionBody}>
                {loading.transacoes ? <div className={styles.loadingState}><div className={styles.spinner}></div></div> :
                  transacoes.length > 0 ? transacoes.map((transacao) => {
                    const descricaoUpper = transacao.descricao.toUpperCase();
                    return (
                        <div key={transacao._id} className={styles.transacaoItem}>
                          <div className={styles.transacaoInfo}>
                              <div className={styles.transacaoHeader}>
                                <span className={styles.data}>{formatarData(transacao.data)}</span>
                                <span className={`${styles.valor} ${transacao.valor >= 0 ? styles.positivo : styles.negativo}`}>
                                  {formatarMoeda(transacao.valor)}
                                </span>
                              </div>
                              <p className={styles.descricao}>
                                {descricaoUpper.includes('PIX') && <FaPix className={`${styles.transactionIcon} ${styles.pix}`} title="Transação PIX" />}
                                {descricaoUpper.includes('TED') && <FaPaperPlane className={`${styles.transactionIcon} ${styles.ted}`} title="Transação TED" />}
                                {transacao.descricao}
                              </p>
                              <SugestaesInteligentes
                                transacao={transacao}
                                onAplicarSugestao={(index: number) => aplicarSugestao(transacao._id, index)}
                              />
                          </div>
                        </div>
                    );
                  }) : <div className={styles.emptyState}><p>Nenhuma transação para conciliar.</p></div>
                }
              </div>
            </section>
        </main>

        <aside className={styles.rightSidebar}>
          <section className={styles.contentSection}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Empresa</h2></div>
              <div className={styles.sectionBody}>
                  {empresas.length > 0 ? (
                      <select value={empresaSelecionada} onChange={(e) => dispatch({ type: 'SELECIONAR_EMPRESA', payload: e.target.value })} className={styles.accountSelector}>
                          {empresas.map(emp => (<option key={emp._id} value={emp._id}>{emp.nome}</option>))}
                      </select>
                  ) : <p>Nenhuma empresa cadastrada.</p>}
              </div>
          </section>
          <section className={styles.contentSection}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Contas</h2></div>
              <div className={styles.sectionBody}>
                {loading.contas ? <p>Carregando...</p> : 
                  contas.length > 0 ? (
                    <select value={contaSelecionada} onChange={(e) => dispatch({ type: 'SELECIONAR_CONTA', payload: e.target.value })} className={styles.accountSelector}>
                      {contas.map(conta => (<option key={conta._id} value={conta._id}>{conta.nome}</option>))}
                    </select>
                  ) : empresas.length > 0 ? <p>Nenhuma conta cadastrada.</p> : <p>Cadastre uma empresa primeiro.</p>
                }
              </div>
          </section>
        </aside>
      </div>

      {modals.empresa && (
        <ModalNovaEmpresa
          onClose={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'empresa', valor: false } })}
          onEmpresaCriada={(novaEmpresa) => dispatch({ type: 'ADD_EMPRESA', payload: novaEmpresa })}
        />
      )}
      {modals.conta && (
        <ModalNovaConta
          empresaId={empresaSelecionada}
          onClose={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'conta', valor: false } })}
          onContaCriada={(novaConta) => dispatch({ type: 'ADD_CONTA', payload: novaConta })}
        />
      )}
    </Layout>
  );
};

export default ConciliacaoPage;