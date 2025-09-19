// src/components/ModalNovaConta.tsx
import React, { useState, FC } from 'react';
import { contaBancariaService } from '../services';
import { Conta } from '@/types';
import styles from '@/styles/ModalNovaConta.module.css';

interface ModalNovaContaProps {
  empresaId: string;
  onClose: () => void;
  onContaCriada: (novaConta: Conta) => void;
}

const ModalNovaConta: FC<ModalNovaContaProps> = ({ empresaId, onClose, onContaCriada }) => {
  const [formData, setFormData] = useState({
    nome: '',
    banco: { codigo: '237', nome: 'Bradesco' },
    agencia: '',
    conta: '',
    tipo: 'corrente',
    dataSaldoInicial: new Date().toISOString().split('T')[0],
    saldoInicial: '0,00'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBancoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const codigo = e.target.value;
    const nome = e.target.options[e.target.selectedIndex].text;
    setFormData(prev => ({ ...prev, banco: { codigo, nome } }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) {
        alert("Nenhuma empresa selecionada.");
        return;
    }
    try {
        const dadosParaEnviar = {
            ...formData,
            empresa: empresaId,
            saldoInicial: parseFloat(formData.saldoInicial.replace(/\./g, '').replace(',', '.'))
        }
        const novaConta = await contaBancariaService.criar(dadosParaEnviar);
        onContaCriada(novaConta);
        onClose();
    } catch (error) {
        console.error("Erro ao criar conta:", error);
        alert("Não foi possível criar a conta.");
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nova Conta Bancária</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="nome">Como deseja chamar essa conta?</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required placeholder="Ex.: Conta Corrente Bradesco" />
          </div>
          <div className={`${styles.row} ${styles.col3}`}>
            <div className={styles.formGroup}>
              <label htmlFor="banco">Banco</label>
              <select id="banco" name="banco" value={formData.banco.codigo} onChange={handleBancoChange} required>
                <option value="237">Bradesco</option>
                <option value="341">Itaú</option>
                <option value="001">Banco do Brasil</option>
                <option value="104">Caixa Econômica</option>
                <option value="033">Santander</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="agencia">Agência</label>
              <input type="text" id="agencia" name="agencia" value={formData.agencia} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="conta">Conta</label>
              <input type="text" id="conta" name="conta" value={formData.conta} onChange={handleChange} required />
            </div>
          </div>
           <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="dataSaldoInicial">Data de início do controle</label>
              <input type="date" id="dataSaldoInicial" name="dataSaldoInicial" value={formData.dataSaldoInicial} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="saldoInicial">Saldo inicial do dia</label>
              <input type="text" id="saldoInicial" name="saldoInicial" value={formData.saldoInicial} onChange={handleChange} placeholder="R$ 0,00" required />
            </div>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary}>Cadastrar Conta</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovaConta;