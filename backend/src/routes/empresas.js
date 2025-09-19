// src/routes/empresas.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Empresa = require('../models/Empresa');

const router = express.Router();

// GET /api/empresas - Listar empresas
router.get('/', async (req, res) => {
  try {
    const empresas = await Empresa.find().select('-__v');
    res.json(empresas);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao listar empresas' });
  }
});

// GET /api/empresas/:id - Buscar empresa por ID
router.get('/:id', async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: true, message: 'Empresa não encontrada' });
    }
    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao buscar empresa' });
  }
});

// POST /api/empresas - Criar empresa
router.post('/', [
  body('nome').notEmpty().trim().withMessage('Nome é obrigatório'),

  // ALTERAÇÃO: Adicionado um "sanitizer" para formatar o CNPJ antes de validar
  body('cnpj')
    .trim()
    .customSanitizer(value => (value || '').replace(/\D/g, '')) // 1. Remove tudo que não for dígito
    .customSanitizer(value => {                                 // 2. Aplica a máscara de formatação
        if (value.length === 14) {
            return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return value;
    })
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/) // 3. Agora a validação funciona
    .withMessage('CNPJ inválido'),

  body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, details: errors.array() });
    }
    
    const empresaExistente = await Empresa.findOne({ cnpj: req.body.cnpj });
    if(empresaExistente) {
        return res.status(409).json({ error: true, message: 'Já existe uma empresa com este CNPJ.' });
    }

    const empresa = new Empresa(req.body);
    await empresa.save();
    res.status(201).json(empresa);
  } catch (error) {
    res.status(500).json({ error: true, message: 'Erro ao criar empresa' });
  }
});

module.exports = router;