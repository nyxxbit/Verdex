// src/components/SugestaesInteligentes.tsx
import React, { FC } from 'react';
import styles from '@/styles/SugestoesInteligentes.module.css';
import { FaBrain, FaCheck, FaTimes } from 'react-icons/fa';
import { Transacao } from '@/types';

interface SugestaesInteligentesProps {
  transacao: Transacao;
  onAplicarSugestao: (sugestaoIndex: number) => void;
}

const SugestaesInteligentes: FC<SugestaesInteligentesProps> = ({ 
    transacao, 
    onAplicarSugestao 
}) => {
    if (!transacao?.sugestoes?.length) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3><FaBrain /> Sugestão</h3>
            </div>
            {transacao.sugestoes.map((sugestao: any, index: number) => (
                <div key={index} className={styles.sugestaoItem}>
                    <div className={styles.sugestaoHeader}>
                        <span className={styles.categoriaNome}>
                            {sugestao.categoria?.nome || sugestao.categoria}
                        </span>
                        <span className={styles.confiancaBadge}>{sugestao.confianca}%</span>
                    </div>
                    <p className={styles.motivo}>{sugestao.motivo}</p>
                    <div className={styles.acoesContainer}>
                        <button className={`${styles.btnAcao} ${styles.primary}`} onClick={() => onAplicarSugestao(index)}>
                            <FaCheck /> Aplicar
                        </button>
                        <button className={`${styles.btnAcao} ${styles.secondary}`}><FaTimes /> Rejeitar</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SugestaesInteligentes;