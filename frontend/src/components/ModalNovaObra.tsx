// src/components/ModalNovaObra.tsx
import React, { useState, useEffect, FC } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { obraService, contatoService } from '@/services';
import { Contato } from '@/types';
import styles from '@/styles/Modal.module.css';

interface ModalNovaObraProps {
  onClose: () => void;
  onObraCriada: (novaObra: any) => void;
}

const ModalNovaObra: FC<ModalNovaObraProps> = ({ onClose, onObraCriada }) => {
  const { state } = useAppContext();
  const { empresaSelecionada } = state;
  const [formData, setFormData] = useState({
    nome: '',
    cliente: '',
    cidade: '',
    estado: '',
  });
  const [clientes, setClientes] = useState<Contato[]>([]);

  useEffect(() => {
    const buscarClientes = async () => {
      if (empresaSelecionada) {
        // ALTERAÇÃO: Busca agora usa 'cliente' em minúsculas para corresponder ao backend
        const listaClientes = await contatoService.listar({ empresa: empresaSelecionada, tipo: 'cliente' });
        setClientes(listaClientes);
      }
    };
    buscarClientes();
  }, [empresaSelecionada]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dadosParaEnviar = {
        empresa: empresaSelecionada,
        cliente: formData.cliente,
        nome: formData.nome,
        endereco: {
          cidade: formData.cidade,
          estado: formData.estado.toUpperCase(),
        },
      };
      const novaObra = await obraService.criar(dadosParaEnviar);
      onObraCriada(novaObra);
      onClose();
    } catch (error) {
      console.error("Erro ao criar obra:", error);
      alert("Não foi possível criar a obra.");
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nova Obra</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="nome">Nome da Obra</label>
            <input type="text" id="nome" name="nome" onChange={handleChange} required placeholder="Ex: Construção Edifício Central" />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cliente">Cliente Responsável</label>
            <select id="cliente" name="cliente" onChange={handleChange} required value={formData.cliente}>
              <option value="" disabled>Selecione um cliente</option>
              {clientes.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
            </select>
          </div>

          <div className={`${styles.row} ${styles.col2}`}>
            <div className={styles.formGroup}>
              <label htmlFor="cidade">Cidade</label>
              <input type="text" id="cidade" name="cidade" onChange={handleChange} required placeholder="Ex: Suzano" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="estado">Estado</label>
              <input type="text" id="estado" name="estado" onChange={handleChange} required placeholder="Ex: SP" maxLength={2} />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary}>Cadastrar Obra</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovaObra;