// src/pages/index.tsx
import React, { FC, useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import styles from '@/styles/home.module.css';
import { FaChartLine, FaFileUpload, FaBrain, FaLayerGroup } from 'react-icons/fa';

const useOnScreen = (options?: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);
        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }
        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [ref, options]);
    return [ref, isVisible] as const;
};

const HomePage: FC = () => {
  const [ref1, isVisible1] = useOnScreen({ threshold: 0.3 });
  const [ref2, isVisible2] = useOnScreen({ threshold: 0.3 });

  // ALTERAÇÃO: Adicionada a propriedade 'fullWidth'
  return (
    <Layout title="Verde Flux - Gestão Financeira Inteligente" fullWidth={true}>
      <div className={styles.pageWrapper}>
        
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Sua Gestão Financeira, Clara e Inteligente.</h1>
            <p className={styles.heroDescription}>
              Assuma o controle total do seu fluxo de caixa. Importe extratos, concilie transações e ganhe tempo com sugestões automáticas.
            </p>
            <div className={styles.heroActions}>
              <Link href="/conciliacao" className={`${styles.btn} ${styles.btnPrimary}`}>
                Começar Agora
              </Link>
              <a href="#showcase" className={`${styles.btn} ${styles.btnSecondary}`}>
                Ver Funcionalidades
              </a>
            </div>
          </div>
        </section>

        <section id="showcase" className={styles.showcase}>
          <div className={styles.showcaseInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>O Sistema em Ação</h2>
              <p className={styles.sectionSubtitle}>
                Veja como nossa interface limpa e intuitiva transforma a complexidade financeira em simplicidade.
              </p>
            </div>
            
            <div ref={ref1} className={`${styles.featureRow} ${isVisible1 ? styles.visible : styles.hidden}`}>
              <div className={styles.featureText}>
                <h3>Dashboard Completo</h3>
                <p>Tenha uma visão geral da saúde financeira do seu negócio. Acompanhe saldos, receitas e despesas com resumos claros, tudo em um só lugar.</p>
              </div>
              <div className={styles.mockup}>
                <div className={styles.mockupHeader}>
                  <div className={styles.mockupHeaderDots}>
                    <div className={`${styles.dot} ${styles.red}`}></div>
                    <div className={`${styles.dot} ${styles.yellow}`}></div>
                    <div className={`${styles.dot} ${styles.green}`}></div>
                  </div>
                </div>
                <div className={styles.mockupContent}>
                  <div className={styles.mockupCard}>
                    <p>Saldo Final do Mês</p>
                    <h4>R$ 14.079,87</h4>
                  </div>
                  <div className={styles.mockupCard} style={{ backgroundColor: 'var(--bs-primary-light)' }}>
                     <p>Créditos no Mês</p>
                     <h4 style={{ color: 'var(--bs-success)' }}>R$ 144.225,08</h4>
                  </div>
                </div>
              </div>
            </div>

            <div ref={ref2} className={`${styles.featureRow} ${styles.reverse} ${isVisible2 ? styles.visible : styles.hidden}`}>
              <div className={styles.featureText}>
                <h3>Conciliação Simplificada</h3>
                <p>Importe seu extrato e deixe que nossa inteligência artificial sugira as categorias. Conciliar suas contas nunca foi tão rápido e preciso.</p>
              </div>
              <div className={styles.mockup}>
                 <div className={styles.mockupHeader}><div className={styles.mockupHeaderDots}><div className={`${styles.dot} ${styles.red}`}></div><div className={`${styles.dot} ${styles.yellow}`}></div><div className={`${styles.dot} ${styles.green}`}></div></div></div>
                 <div className={styles.mockupContent}>
                    <ul className={styles.mockupList}>
                        <li className={styles.mockupListItem}>
                            <span>TRANSFERENCIA PIX REM: CLIENTE A</span>
                            <span className={styles.credit}>R$ 1.250,00</span>
                        </li>
                        <li className={styles.mockupListItem}>
                            <span>PAGTO ELETRON COBRANCA ALUGUEL</span>
                            <span className={styles.debit}>-R$ 2.800,00</span>
                        </li>
                         <li className={styles.mockupListItem}>
                            <span>TARIFA BANCARIA TRANSF PGTO PIX</span>
                            <span className={styles.debit}>-R$ 9,80</span>
                        </li>
                    </ul>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default HomePage;