// src/pages/resumo.tsx
import React, { FC, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import styles from '@/styles/resumo.module.css';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { dashboardService } from '@/services';
import { useAppContext } from '@/contexts/AppContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const ResumoPage: FC = () => {
  const { state } = useAppContext();
  const { contaSelecionada } = state;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!contaSelecionada) {
        setLoading(false);
        setData(null);
        return;
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        const hoje = new Date();
        const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const resultado = await dashboardService.getResumo({
          contaBancariaId: contaSelecionada,
          dataInicio,
          dataFim
        });
        setData(resultado);
      } catch (error) {
        console.error("Erro ao buscar dados do resumo", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contaSelecionada]);

  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const lineChartData = {
    labels: data?.saldoDiario.map((d: any) => new Date(d.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })) || [],
    datasets: [{
      label: 'Saldo Acumulado', data: data?.saldoDiario.map((d: any) => d.saldo) || [],
      borderColor: 'var(--bs-primary)', backgroundColor: 'rgba(31, 172, 75, 0.1)', fill: true, tension: 0.3,
    }],
  };
  const doughnutChartData = (chartData: any[], colors: string[]) => ({
    labels: chartData?.map(d => d.name) || [],
    datasets: [{
      data: chartData?.map(d => d.value) || [],
      backgroundColor: colors, borderColor: 'var(--bs-white)', borderWidth: 2,
    }],
  });
  
  const colorsDespesas = ['#e22f36', '#ffc200', '#343a40', '#969799', '#787a7b', '#b4b5b6'];
  const colorsReceitas = ['#1fac4b', '#2ab9e7', '#6431e2', '#ff40b3'];

  return (
    <Layout title="Resumo - Verde Flux">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Resumo do Mês</h1>
      </div>
      
      <nav className={styles.tabs}>
        <Link href="/resumo" legacyBehavior><a className={router.pathname === '/resumo' ? `${styles.tab} ${styles.active}` : styles.tab}>Resumo</a></Link>
        <Link href="/conciliacao" legacyBehavior><a className={router.pathname === '/conciliacao' ? `${styles.tab} ${styles.active}` : styles.tab}>Contas & Extratos</a></Link>
        <Link href="#" legacyBehavior><a className={styles.tab}>Fluxo de caixa</a></Link>
      </nav>

      {loading ? <div className={styles.loadingState}>Carregando...</div> : !data || !contaSelecionada ? <div className={styles.emptyState}>Selecione uma empresa e conta para ver o resumo.</div> : (
        <div className={styles.gridContainer}>
          <div className={styles.resumoCard}>
            <span className={styles.cardLabel}>Saldo Atual</span>
            <h2 className={styles.cardValor}>{formatarMoeda(data.resumoCards.saldoFinal)}</h2>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.cardLabel}>Receitas no Mês</span>
            <h2 className={`${styles.cardValor} ${styles.positivo}`}>{formatarMoeda(data.resumoCards.totalCreditos)}</h2>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.cardLabel}>Despesas no Mês</span>
            <h2 className={`${styles.cardValor} ${styles.negativo}`}>{formatarMoeda(data.resumoCards.totalDebitos)}</h2>
          </div>
          
          <div className={`${styles.resumoCard} ${styles.fullWidth}`}>
            <span className={styles.cardLabel}>Evolução do Saldo</span>
            <div className={styles.chartContainer}>
              <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>

          <div className={styles.resumoCard}>
            <span className={styles.cardLabel}>Despesas por Categoria</span>
            <div className={styles.chartContainerSmall}>
              <Doughnut data={doughnutChartData(data.despesasPorCategoria, colorsDespesas)} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}/>
            </div>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.cardLabel}>Receitas por Categoria</span>
            <div className={styles.chartContainerSmall}>
               <Doughnut data={doughnutChartData(data.receitasPorCategoria, colorsReceitas)} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}/>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ResumoPage;