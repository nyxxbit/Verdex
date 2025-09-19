const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /api/cnpj/:taxId
router.get('/:taxId', async (req, res) => {
    const { taxId } = req.params;
    const cnpjLimpo = taxId.replace(/[^\d]/g, ''); // Remove formatação (pontos, barras, etc.)

    if (cnpjLimpo.length !== 14) {
        return res.status(400).json({ error: true, message: 'CNPJ inválido. Deve conter 14 dígitos.' });
    }

    // ALTERAÇÃO: Bloco de verificação da API Key foi removido.

    try {
        const url = `https://open.cnpja.com/office/${cnpjLimpo}`;
        
        // ALTERAÇÃO: Chamada da API sem o cabeçalho de 'Authorization'
        const response = await axios.get(url, {
            timeout: 8000 // Aumentado um pouco o timeout para APIs públicas
        });

        // Filtrar e retornar apenas os dados que nos interessam
        const dados = response.data;
        const dadosFiltrados = {
            nome: dados.alias || dados.company.name,
            razaoSocial: dados.company.name,
            cnpj: dados.taxId,
            email: dados.emails?.[0]?.address || '',
            telefone: dados.phones?.[0] ? `${dados.phones[0].area}${dados.phones[0].number}` : '',
            endereco: {
                rua: dados.address.street,
                numero: dados.address.number,
                bairro: dados.address.district,
                cidade: dados.address.city,
                estado: dados.address.state,
                cep: dados.address.zip,
            }
        };

        res.json(dadosFiltrados);

    } catch (error) {
        console.error(`Erro ao consultar CNPJ ${cnpjLimpo}:`, error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Não foi possível consultar o CNPJ.';
        res.status(status).json({ error: true, message });
    }
});

module.exports = router;