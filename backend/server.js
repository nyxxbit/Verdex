// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const listEndpoints = require('express-list-endpoints');
const path = require('path');

// --- Importação de Rotas com Caminhos Absolutos ---
const empresasRoutes = require(path.join(__dirname, 'src', 'routes', 'empresas'));
const contasBancariasRoutes = require(path.join(__dirname, 'src', 'routes', 'contasBancarias'));
const transacoesRoutes = require(path.join(__dirname, 'src', 'routes', 'transacoes'));
const categoriasRoutes = require(path.join(__dirname, 'src', 'routes', 'categorias'));
const contatosRoutes = require(path.join(__dirname, 'src', 'routes', 'contatos'));
const conciliacoesRoutes = require(path.join(__dirname, 'src', 'routes', 'conciliacoes'));
const ofxRoutes = require(path.join(__dirname, 'src', 'routes', 'ofx'));
const sugestoesRoutes = require(path.join(__dirname, 'src', 'routes', 'sugestoes'));
const cnpjRoutes = require(path.join(__dirname, 'src', 'routes', 'cnpj'));
const dashboardRoutes = require(path.join(__dirname, 'src', 'routes', 'dashboard')); // Adicionar esta linha
const obrasRoutes = require(path.join(__dirname, 'src', 'routes', 'obras')); // Adicionar esta linha

// --- Importação de Modelos ---
const Categoria = require(path.join(__dirname, 'src', 'models', 'Categoria'));
const Empresa = require(path.join(__dirname, 'src', 'models', 'Empresa'));

const app = express();

// --- Middlewares ---
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
});
app.use('/api/', limiter);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seudominio.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Conexão MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Conectado ao MongoDB');
  initializeDefaultData();
})
.catch((error) => {
  console.error('❌ Erro ao conectar no MongoDB:', error);
  process.exit(1);
});

// --- Inicialização de Dados Padrão ---
async function initializeDefaultData() {
  try {
    const categoriasExistentes = await Categoria.countDocuments({ padrao: true });
    if (categoriasExistentes === 0) {
      console.log('Criando categorias padrão...');
      const categoriasPadrao = Categoria.getCategoriasPadrao();
      await Categoria.insertMany(categoriasPadrao);
      console.log('✅ Categorias padrão criadas');
    }
  } catch (error) {
    if (error.code !== 11000) {
      console.error('❌ Erro ao inicializar dados padrão:', error);
    }
  }
}

// --- Rotas da API ---
app.use('/api/empresas', empresasRoutes);
app.use('/api/contas', contasBancariasRoutes);
app.use('/api/transacoes', transacoesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/contatos', contatosRoutes);
app.use('/api/conciliacoes', conciliacoesRoutes);
app.use('/api/ofx', ofxRoutes);
app.use('/api/sugestoes', sugestoesRoutes);
app.use('/api/cnpj', cnpjRoutes);
app.use('/api/dashboard', dashboardRoutes); // Adicionar esta linha
app.use('/api/obras', obrasRoutes); // Adicionar esta linha

// Rota de saúde da aplicação
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// --- Middlewares de Erro e 404 ---
app.use((req, res, next) => {
    res.status(404).json({
        error: true,
        message: `A rota ${req.method} ${req.originalUrl} não foi encontrada no servidor.`
    });
});

app.use((error, req, res, next) => {
  console.error('❌ Erro Inesperado:', error);
  res.status(500).json({
    error: true,
    message: 'Erro interno do servidor',
    details: error.message
  });
});

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  console.log('📋 Rotas disponíveis:');
  const endpoints = listEndpoints(app);
  endpoints.forEach(endpoint => {
    if (endpoint.path.startsWith('/api/')) {
        console.log(`  ${endpoint.methods.join(', ').padEnd(18)} ${endpoint.path}`);
    }
  });
});