// src/pages/contatos.tsx
import React, { FC, useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAppContext } from '@/contexts/AppContext';
import { obraService, contatoService } from '@/services';
import styles from '@/styles/contatos.module.css';
import { FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import { Contato } from '@/types';
import ModalNovaObra from '@/components/ModalNovaObra';
import ModalNovoContato from '@/components/ModalNovoContato';

const ContatosPage: FC = () => {
  const { state } = useAppContext();
  const { empresaSelecionada } = state;
  const [activeTab, setActiveTab] = useState('Obras');
  
  const [obras, setObras] = useState<any[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalObraAberto, setModalObraAberto] = useState(false);
  const [modalContatoAberto, setModalContatoAberto] = useState(false);

  const buscarDados = useCallback(async () => {
    if (!empresaSelecionada) return;
    setLoading(true);
    try {
      if (activeTab === 'Obras') {
        const listaObras = await obraService.listar(empresaSelecionada);
        setObras(listaObras);
      } else {
        // ALTERAÇÃO: Garante que o tipo seja enviado em minúsculas
        const tipoContato = activeTab.slice(0, -1).toLowerCase();
        const listaContatos = await contatoService.listar({ empresa: empresaSelecionada, tipo: tipoContato });
        setContatos(listaContatos);
      }
    } catch (error) {
      console.error(`Erro ao buscar ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  }, [empresaSelecionada, activeTab]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  const handleObraCriada = (novaObra: any) => {
    setObras(prev => [novaObra, ...prev]);
  };

  const handleContatoCriado = (novoContato: Contato) => {
    // Se o novo contato for do tipo que está na aba ativa, adiciona à lista
    if (novoContato.tipo.toLowerCase() === activeTab.slice(0, -1).toLowerCase()) {
        setContatos(prev => [novoContato, ...prev]);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Em Andamento': return styles.statusEmAndamento;
      case 'Planejamento': return styles.statusPlanejamento;
      case 'Concluída': return styles.statusConcluida;
      default: return '';
    }
  };

  return (
    <Layout title="Contatos e Obras - Verde Flux">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Contatos & Obras</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setModalContatoAberto(true)}>+ Novo Contato</button>
          <button className={styles.btnPrimary} onClick={() => setModalObraAberto(true)}>+ Nova Obra</button>
        </div>
      </div>

      <nav className={styles.tabs}>
        <span className={activeTab === 'Obras' ? styles.active : ''} onClick={() => setActiveTab('Obras')}>Obras</span>
        <span className={activeTab === 'Clientes' ? styles.active : ''} onClick={() => setActiveTab('Clientes')}>Clientes</span>
        <span className={activeTab === 'Fornecedores' ? styles.active : ''} onClick={() => setActiveTab('Fornecedores')}>Fornecedores</span>
        <span className={activeTab === 'Funcionarios' ? styles.active : ''} onClick={() => setActiveTab('Funcionarios')}>Funcionários</span>
      </nav>

      {loading && <p>Carregando...</p>}

      {!loading && activeTab === 'Obras' && (
        <div className={styles.gridObras}>
          {obras.map(obra => (
            <div key={obra._id} className={styles.obraCard}>
              <div className={styles.obraHeader}>
                <div>
                  <h3 className={styles.obraTitulo}>{obra.nome}</h3>
                  <span className={styles.obraCliente}>{obra.cliente.nome}</span>
                </div>
                <span className={`${styles.obraStatus} ${getStatusClass(obra.status)}`}>{obra.status}</span>
              </div>
              <div className={styles.obraDetalhes}>
                <div className={styles.detalheItem}><FaMapMarkerAlt /><span>{obra.endereco.cidade} - {obra.endereco.estado}</span></div>
                <div className={styles.detalheItem}><FaUsers /><span>{obra.responsaveis.length} Funcionário(s)</span></div>
              </div>
              {obra.responsaveis.length > 0 && (
                <div className={styles.funcionariosLista}>
                  <h4>Equipe:</h4>
                  <div>
                    {obra.responsaveis.map((func: any) => (
                      <span key={func._id} className={styles.funcionarioTag}>{func.nome}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {!loading && activeTab !== 'Obras' && (
        <div>
          {contatos.map(contato => (
            <div key={contato._id}>{contato.nome}</div>
          ))}
        </div>
      )}

      {modalObraAberto && <ModalNovaObra onClose={() => setModalObraAberto(false)} onObraCriada={handleObraCriada} />}
      {modalContatoAberto && <ModalNovoContato onClose={() => setModalContatoAberto(false)} onContatoCriado={handleContatoCriado} />}
    </Layout>
  );
};

export default ContatosPage;