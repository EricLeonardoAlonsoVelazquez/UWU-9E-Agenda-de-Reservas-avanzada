const db = require('../config/firebaseConfig');
const salasRef = db.collection('salas');

const getAll = async () => {
  try {
    const snapshot = await salasRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error('Error al obtener salas: ' + error.message);
  }
};

const getById = async (id) => {
  try {
    const doc = await salasRef.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error('Error al obtener sala: ' + error.message);
  }
};

const create = async (salaData) => {
  try {
    const docRef = await salasRef.add(salaData);
    return { id: docRef.id, ...salaData };
  } catch (error) {
    throw new Error('Error al crear sala: ' + error.message);
  }
};

const update = async (id, salaData) => {
  try {
    await salasRef.doc(id).update(salaData);
    return { id, ...salaData };
  } catch (error) {
    throw new Error('Error al actualizar sala: ' + error.message);
  }
};

const remove = async (id) => {
  try {
    await salasRef.doc(id).delete();
    return true;
  } catch (error) {
    throw new Error('Error al eliminar sala: ' + error.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
