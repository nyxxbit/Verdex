// src/components/ModalNovoContato.tsx
import React, { useState, FC } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { contatoService } from '@/services';
import { Contato } from '@/types';
import styles from '@/styles/Modal.module.css';

interface ModalNovoContatoProps {
  onClose: () => void;
  onContatoCriado: (novoContato: Contato) => void;
}

// O tipo agora usa as strings em minúsculas
type FormData = {
  nome: string;
  tipo: 'cliente' | 'fornecedor' | 'funcionario';
  subtipoFornecedor: string;
};

const ModalNovoContato: FC<ModalNovoContatoProps> = ({ onClose, onContatoCriado }) => {
  const { state } = useAppContext();
  const { empresaSelecionada } = state;

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    tipo: 'cliente', // Estado inicial em minúsculas
    subtipoFornecedor: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value as FormData[keyof FormData] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dadosParaEnviar: Partial<Contato> = {
        empresa: empresaSelecionada,
        nome: formData.nome,
        tipo: formData.tipo,
        ...(formData.tipo === 'fornecedor' && { subtipoFornecedor: formData.subtipoFornecedor }),
      };
      const novoContato = await contatoService.criar(dadosParaEnviar);
      onContatoCriado(novoContato);
      onClose();
    } catch (error) {
      console.error("Erro ao criar contato:", error);
      alert("Não foi possível criar o contato.");
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Novo Contato</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="nome">Nome Completo / Razão Social</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
          </div>

          <div className={`${styles.row} ${styles.col2}`}>
            <div className={styles.formGroup}>
              <label htmlFor="tipo">Tipo de Contato</label>
              <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange}>
                {/* ALTERAÇÃO: Values agora em minúsculas */}
                <option value="cliente">Cliente</option>
                <option value="fornecedor">Fornecedor</option>
                <option value="funcionario">Funcionário</option>
              </select>
            </div>

            {formData.tipo === 'fornecedor' && (
              <div className={styles.formGroup}>
                <label htmlFor="subtipoFornecedor">Ramo do Fornecedor</label>
                <input type="text" id="subtipoFornecedor" name="subtipoFornecedor" value={formData.subtipoFornecedor} onChange={handleChange} placeholder="Ex: Restaurante, Material de Construção" />
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary}>Cadastrar Contato</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoContato;