const salaModel = require('../models/salaModel');

const getAllSalas = async () => {
  return await salaModel.getAll();
};

const getSalaById = async (id) => {
  const sala = await salaModel.getById(id);
  if (!sala) {
    throw new Error('Sala no encontrada');
  }
  return sala;
};

const createSala = async (salaData) => {
  // Validaciones básicas
  if (!salaData.nombre || !salaData.capacidad) {
    throw new Error('Nombre y capacidad son requeridos');
  }
  if (salaData.capacidad <= 0) {
    throw new Error('La capacidad debe ser mayor a 0');
  }

  return await salaModel.create(salaData);
};

const updateSala = async (id, salaData) => {
  await getSalaById(id); // Verificar que existe
  return await salaModel.update(id, salaData);
};

const deleteSala = async (id) => {
  const sala = await getSalaById(id);
  
  // Verificar si la sala tiene reservas futuras
  // (Implementar esta verificación cuando tengas el servicio de reservas)
  
  return await salaModel.remove(id);
};

module.exports = {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deleteSala
};