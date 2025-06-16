const db = require('../config/firebaseConfig');
const usuariosRef = db.collection('usuarios');

const getAll = async () => {
  try {
    const snapshot = await usuariosRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error('Error al obtener usuarios: ' + error.message);
  }
};

const getById = async (id) => {
  try {
    const doc = await usuariosRef.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error('Error al obtener usuario: ' + error.message);
  }
};

const create = async (usuarioData) => {
  try {
    const docRef = await usuariosRef.add(usuarioData);
    return { id: docRef.id, ...usuarioData };
  } catch (error) {
    throw new Error('Error al crear usuario: ' + error.message);
  }
};

const update = async (id, usuarioData) => {
  try {
    await usuariosRef.doc(id).update(usuarioData);
    return { id, ...usuarioData };
  } catch (error) {
    throw new Error('Error al actualizar usuario: ' + error.message);
  }
};

const remove = async (id) => {
  try {
    await usuariosRef.doc(id).delete();
    return true;
  } catch (error) {
    throw new Error('Error al eliminar usuario: ' + error.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};