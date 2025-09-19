// src/routes/contatos.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Contato = require('../models/Contato');

const router = express.Router();

// GET /api/contatos - Listar contatos
router.get('/', async (req, res) => {
  try {
    const { empresa, tipo, busca } = req.query;
    
    const filtros = { ativo: true };
    
    if (empresa) filtros.empresa = empresa;
    if (tipo) filtros.tipo = tipo; // A busca já recebe o tipo correto (minúsculo) do frontend
    
    if (busca) {
      filtros.$or = [
        { nome: { $regex: busca, $options: 'i' } },
        { 'documento.numero': { $regex: busca, $options: 'i' } }
      ];
    }
    
    const contatos = await Contato.find(filtros)
      .populate('empresa', 'nome')
      .sort({ nome: 1 });
    
    res.json(contatos);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao listar contatos' });
  }
});

// POST /api/contatos - Criar contato
router.post('/', [
  body('empresa').isMongoId().withMessage('Empresa inválida'),
  body('nome').notEmpty().trim().withMessage('Nome é obrigatório'),
  // ALTERAÇÃO: Validação agora espera os valores em minúsculas para consistência
  body('tipo').isIn(['cliente', 'fornecedor', 'funcionario']).withMessage('Tipo inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, details: errors.array() });
    }

    const contato = new Contato(req.body);
    await contato.save();
    await contato.populate('empresa', 'nome');
    
    res.status(201).json(contato);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao criar contato' });
  }
});

module.exports = router;