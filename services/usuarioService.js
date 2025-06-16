const usuarioModel = require('../models/usuarioModel');

// Función local para reemplazar emailSender
const enviarEmail = (correo, asunto, mensaje) => {
  console.log(`[Email simulado] Para: ${correo}`);
  console.log(`Asunto: ${asunto}`);
  console.log(`Cuerpo: ${mensaje}\n`);
  return Promise.resolve();
};

const getAllUsuarios = async () => {
  return await usuarioModel.getAll();
};

const getUsuarioById = async (id) => {
  const usuario = await usuarioModel.getById(id);
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }
  return usuario;
};

const createUsuario = async (usuarioData) => {
  if (!usuarioData.nombre || !usuarioData.correo) {
    throw new Error('Nombre y correo son requeridos');
  }

  const usuarios = await usuarioModel.getAll();
  const correoExiste = usuarios.some(u => u.correo === usuarioData.correo);
  if (correoExiste) {
    throw new Error('El correo ya está registrado');
  }

  const nuevoUsuario = await usuarioModel.create(usuarioData);
  
  await enviarEmail(
    usuarioData.correo,
    'Bienvenido al sistema de reservas',
    `Hola ${usuarioData.nombre}, tu cuenta ha sido creada exitosamente.`
  );

  return nuevoUsuario;
};

const updateUsuario = async (id, usuarioData) => {
  await getUsuarioById(id);
  return await usuarioModel.update(id, usuarioData);
};

const deleteUsuario = async (id) => {
  await getUsuarioById(id);
  return await usuarioModel.remove(id);
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};