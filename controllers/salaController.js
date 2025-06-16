const salaService = require('../services/salaService');

const getAllSalas = async (req, res) => {
  try {
    const salas = await salaService.getAllSalas();
    res.json(salas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalaById = async (req, res) => {
  try {
    const sala = await salaService.getSalaById(req.params.id);
    if (!sala) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    res.json(sala);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createSala = async (req, res) => {
  try {
    const nuevaSala = await salaService.createSala(req.body);
    res.status(201).json(nuevaSala);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateSala = async (req, res) => {
  try {
    const salaActualizada = await salaService.updateSala(req.params.id, req.body);
    res.json(salaActualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSala = async (req, res) => {
  try {
    await salaService.deleteSala(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deleteSala
};