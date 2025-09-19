// src/components/Layout.tsx
import React, { ReactNode, FC } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GlobalStyles } from '@/styles/GlobalStyles';
import styles from '@/styles/layout.module.css';
import { FaHome, FaChartBar, FaUsers, FaArrowUp, FaArrowDown, FaFileAlt } from 'react-icons/fa';

const Sidebar: FC = () => {
  const router = useRouter();
  
  // A classe ativa é aplicada se o pathname atual corresponder ou for uma sub-rota
  const isGestaoCaixaActive = router.pathname.startsWith('/conciliacao') || router.pathname.startsWith('/resumo');

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>V</div>
      <nav className={styles.sidebarNav}>
        <Link href="/" title="Início" className={router.pathname === '/' ? styles.active : ''}>
          <FaHome />
        </Link>
        <Link href="/resumo" title="Gestão de Caixa" className={isGestaoCaixaActive ? styles.active : ''}>
          <FaChartBar />
        </Link>
      </nav>
    </aside>
  );
};

const MainMenu: FC = () => {
  const router = useRouter();

  return (
    <div className={styles.mainMenu}>
      <div className={styles.menuHeader}>Verde Flux</div>
      <ul className={styles.menuList}>
        <li><Link href="/" className={router.pathname === '/' ? styles.active : ''}>Início</Link></li>
        <li className={styles.menuSection}>
          <span className={styles.sectionTitle}>FINANCEIRO</span>
          <ul>
            <li>
              <Link href="/resumo" className={router.pathname === '/resumo' ? styles.active : ''}>
                <FaHome /> Resumo
              </Link>
            </li>
            <li>
              <Link href="/conciliacao" className={router.pathname === '/conciliacao' ? styles.active : ''}>
                <FaChartBar /> Contas & Extratos
              </Link>
            </li>
            <li>
              <Link href="/contatos" className={router.pathname === '/contatos' ? styles.active : ''}>
                <FaUsers /> Contatos & Obras
              </Link>
            </li>
            <li><Link href="#"><FaArrowUp /> Recebimentos</Link></li>
            <li><Link href="#"><FaArrowDown /> Pagamentos</Link></li>
            <li><Link href="#"><FaFileAlt /> Relatórios</Link></li>
          </ul>
        </li>
        <li className={styles.menuSection}>
          <span className={styles.sectionTitle}>CONTADOR</span>
          <ul>
            <li><a href="#">Convide seu contador</a></li>
            <li><a href="#">Arquivo permanente</a></li>
          </ul>
        </li>
      </ul>
    </div>
  );
};

interface LayoutProps {
  children: ReactNode;
  title?: string;
  fullWidth?: boolean;
}

const Layout: FC<LayoutProps> = ({ children, title = 'Verde Flux', fullWidth = false }) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      
      <GlobalStyles />
      
      <div className={styles.appWrapper}>
        <Sidebar />
        <MainMenu />
        <div className={styles.contentWrapper}>
          <main className={`${styles.pageContent} ${fullWidth ? styles.noPadding : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;