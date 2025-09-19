// src/components/ModalNovaEmpresa.tsx
import React, { useState, FC } from 'react';
import styles from '@/styles/ModalNovaEmpresa.module.css';
import { cnpjService, DadosEmpresaCNPJ } from '@/services/cnpjService';
import { empresaService } from '@/services';
import { Empresa } from '@/types';

interface ModalNovaEmpresaProps {
  onClose: () => void;
  onEmpresaCriada: (novaEmpresa: Empresa) => void;
}

const ModalNovaEmpresa: FC<ModalNovaEmpresaProps> = ({ onClose, onEmpresaCriada }) => {
  const [cnpj, setCnpj] = useState('');
  const [empresaData, setEmpresaData] = useState<Partial<DadosEmpresaCNPJ>>({});
  const [loading, setLoading] = useState(false);

  const formatarCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const handleBuscarCnpj = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      alert('Por favor, digite um CNPJ válido com 14 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const dados = await cnpjService.consultar(cnpjLimpo);
      setEmpresaData(dados);
    } catch (error) {
      alert('Não foi possível encontrar dados para este CNPJ.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ALTERAÇÃO: Garante que estamos enviando o CNPJ formatado
      const cnpjFormatado = formatarCnpj(empresaData.cnpj || cnpj);

      const novaEmpresa = await empresaService.criar({
          nome: empresaData.nome!,
          cnpj: cnpjFormatado,
          email: empresaData.email!,
          telefone: empresaData.telefone,
          endereco: empresaData.endereco
      });
      onEmpresaCriada(novaEmpresa);
      onClose();
    } catch (error) {
      alert('Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nova Empresa</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="cnpj">CNPJ</label>
            <div className={styles.cnpjWrapper}>
              <input type="text" id="cnpj" name="cnpj" value={formatarCnpj(cnpj)} onChange={e => setCnpj(e.target.value)} maxLength={18} required />
              <button type="button" className={styles.btnSecondary} onClick={handleBuscarCnpj} disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nome">Nome Fantasia</label>
            <input type="text" id="nome" name="nome" value={empresaData.nome || ''} onChange={e => setEmpresaData(p => ({...p, nome: e.target.value}))} disabled={loading} required/>
          </div>
          
          <div className={`${styles.row} ${styles.col3}`}>
            <div className={styles.formGroup}>
              <label>Rua</label>
              <input type="text" value={empresaData.endereco?.rua || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label>Número</label>
              <input type="text" value={empresaData.endereco?.numero || ''} disabled />
            </div>
             <div className={styles.formGroup}>
              <label>CEP</label>
              <input type="text" value={empresaData.endereco?.cep || ''} disabled />
            </div>
          </div>
         
          <div className={styles.footer}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={loading || !empresaData.cnpj}>
              {loading ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovaEmpresa;