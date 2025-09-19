// src/routes/obras.js
const express = require('express');
const Obra = require('../models/Obra');
const Contato = require('../models/Contato');

const router = express.Router();

// GET /api/obras - Listar todas as obras de uma empresa
router.get('/', async (req, res) => {
  try {
    const { empresaId } = req.query;
    if (!empresaId) {
      return res.status(400).json({ message: 'ID da empresa é obrigatório.' });
    }
    const obras = await Obra.find({ empresa: empresaId })
      .populate('cliente', 'nome')
      .populate('responsaveis', 'nome')
      .sort({ createdAt: -1 });
    res.json(obras);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar obras.', error });
  }
});

// POST /api/obras - Criar uma nova obra
router.post('/', async (req, res) => {
  try {
    const novaObra = new Obra(req.body);
    await novaObra.save();
    res.status(201).json(novaObra);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao criar obra.', error });
  }
});

module.exports = router;