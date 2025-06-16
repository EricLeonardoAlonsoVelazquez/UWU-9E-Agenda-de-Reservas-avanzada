const usuarioService = require('../services/usuarioService');

const getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioService.getAllUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsuarioById = async (req, res) => {
  try {
    const usuario = await usuarioService.getUsuarioById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUsuario = async (req, res) => {
  try {
    const nuevoUsuario = await usuarioService.createUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const usuarioActualizado = await usuarioService.updateUsuario(req.params.id, req.body);
    res.json(usuarioActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUsuario = async (req, res) => {
  try {
    await usuarioService.deleteUsuario(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};