const express = require('express');
const { body, validationResult } = require('express-validator');
const Categoria = require('../models/Categoria');

const router = express.Router();

// GET /api/categorias - Listar categorias
router.get('/', async (req, res) => {
  try {
    const { empresa, tipo } = req.query;
    
    const filtros = {
      $or: [{ padrao: true }],
      ativa: true
    };
    
    if (empresa) {
      filtros.$or.push({ empresa });
    }
    
    if (tipo) {
      filtros.tipo = tipo;
    }
    
    const categorias = await Categoria.find(filtros)
      .populate('empresa', 'nome')
      .sort({ nome: 1 });
    
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao listar categorias' });
  }
});

// POST /api/categorias - Criar categoria personalizada
router.post('/', [
  body('nome').notEmpty().trim().withMessage('Nome é obrigatório'),
  body('tipo').isIn(['receita', 'despesa']).withMessage('Tipo deve ser receita ou despesa'),
  body('empresa').isMongoId().withMessage('Empresa inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, details: errors.array() });
    }

    const categoria = new Categoria(req.body);
    await categoria.save();
    await categoria.populate('empresa', 'nome');
    
    res.status(201).json(categoria);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao criar categoria' });
  }
});

module.exports = router;