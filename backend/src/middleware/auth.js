  /**
   * Middleware de autenticação
   * Valida JWT tokens e gerencia autenticação de usuários
   */

  const jwt = require('jsonwebtoken');

  /**
   * Middleware para verificar autenticação JWT
   */
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        message: 'Por favor, forneça um token de autenticação válido'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
      if (err) {
        return res.status(403).json({ 
          error: 'Token inválido',
          message: 'O token fornecido é inválido ou expirou'
        });
      }

      req.user = user;
      next();
    });
  };

  /**
   * Middleware para verificar se é admin
   */
  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem acessar este recurso'
      });
    }
    next();
  };

  /**
   * Middleware que faz autenticação opcional (não bloqueia se não tiver token)
   */
  const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
      next();
    });
  };

  /**
   * Middleware para verificar se o usuário pode acessar uma empresa específica
   */
  const checkEmpresaAccess = (req, res, next) => {
    const empresaId = req.params.empresaId || req.body.empresaId || req.query.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({
        error: 'ID da empresa requerido',
        message: 'O ID da empresa deve ser fornecido'
      });
    }

    // Se for admin, pode acessar qualquer empresa
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Verificar se o usuário tem acesso à empresa
    if (!req.user || !req.user.empresas || !req.user.empresas.includes(empresaId)) {
      return res.status(403).json({
        error: 'Acesso negado à empresa',
        message: 'Você não tem permissão para acessar dados desta empresa'
      });
    }

    next();
  };

  /**
   * Gerar token JWT para usuário
   */
  const generateToken = (userData) => {
    return jwt.sign(
      {
        id: userData.id || userData._id,
        email: userData.email,
        role: userData.role || 'user',
        empresas: userData.empresas || []
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
      }
    );
  };

  module.exports = {
    authenticateToken,
    requireAdmin,
    optionalAuth,
    checkEmpresaAccess,
    generateToken
  };