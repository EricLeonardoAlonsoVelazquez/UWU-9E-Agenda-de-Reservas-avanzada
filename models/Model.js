const db = require('../config/firebaseConfig');

const reservasRef = db.ref('reservas');

const getAllReservas = async () => {
    try {
        const snapshot = await reservasRef.get();
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            fecha_formateada: formatFecha(doc.data().fecha),
            hora_inicio_formateada: formatHora(doc.data().hora_inicio),
            hora_fin_formateada: formatHora(doc.data().hora_fin)
        }));
    } catch (error) {
        console.error('Error en getAllReservas:', error);
        throw new Error('Error al obtener todas las reservas: ' + error.message);
    }
};

const getReservaById = async (id) => {
    try {
        const doc = await reservasRef.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return { 
            id: doc.id, 
            ...doc.data(),
            fecha_formateada: formatFecha(doc.data().fecha),
            hora_inicio_formateada: formatHora(doc.data().hora_inicio),
            hora_fin_formateada: formatHora(doc.data().hora_fin)
        };
    } catch (error) {
        console.error('Error en getReservaById:', error);
        throw new Error('Error al obtener reserva por ID: ' + error.message);
    }
};

const createReserva = async (reservaData) => {
    try {
        const requiredFields = ['usuario_id', 'sala_id', 'fecha', 'hora_inicio', 'hora_fin'];
        const missingFields = requiredFields.filter(field => !reservaData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reservaData.fecha)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reservaData.hora_inicio) || 
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reservaData.hora_fin)) {
            throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
        }
        const reservaConTimestamps = {
            ...reservaData,
            estado: reservaData.estado || 'pendiente',
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString()
        };

        const docRef = await reservasRef.add(reservaConTimestamps);
        return { 
            id: docRef.id, 
            ...reservaConTimestamps,
            fecha_formateada: formatFecha(reservaData.fecha),
            hora_inicio_formateada: formatHora(reservaData.hora_inicio),
            hora_fin_formateada: formatHora(reservaData.hora_fin)
        };
    } catch (error) {
        console.error('Error en createReserva:', error);
        throw new Error('Error al crear reserva: ' + error.message);
    }
};

const updateReserva = async (id, reservaData) => {
    try {
        const reserva = await getReservaById(id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        const datosActualizados = {
            ...reservaData,
            actualizado_en: new Date().toISOString()
        };

        await reservasRef.doc(id).update(datosActualizados);
        return { 
            id, 
            ...datosActualizados,
            fecha_formateada: formatFecha(reservaData.fecha || reserva.fecha),
            hora_inicio_formateada: formatHora(reservaData.hora_inicio || reserva.hora_inicio),
            hora_fin_formateada: formatHora(reservaData.hora_fin || reserva.hora_fin)
        };
    } catch (error) {
        console.error('Error en updateReserva:', error);
        throw new Error('Error al actualizar reserva: ' + error.message);
    }
};

const deleteReserva = async (id) => {
    try {
        await reservasRef.doc(id).delete();
        return true;
    } catch (error) {
        console.error('Error en deleteReserva:', error);
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const getReservasBySalaAndDate = async (salaId, fecha) => {
    try {
        const snapshot = await reservasRef
            .where('sala_id', '==', salaId)
            .where('fecha', '==', fecha)
            .get();
            
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            fecha_formateada: formatFecha(doc.data().fecha),
            hora_inicio_formateada: formatHora(doc.data().hora_inicio),
            hora_fin_formateada: formatHora(doc.data().hora_fin)
        }));
    } catch (error) {
        console.error('Error en getReservasBySalaAndDate:', error);
        throw new Error('Error al obtener reservas por sala y fecha: ' + error.message);
    }
};

const checkDisponibilidad = async (salaId, fecha, horaInicio, horaFin) => {
    try {
        const reservas = await getReservasBySalaAndDate(salaId, fecha);
        const horaInicioMinutos = convertToMinutes(horaInicio);
        const horaFinMinutos = convertToMinutes(horaFin);
        for (const reserva of reservas) {
            const reservaInicio = convertToMinutes(reserva.hora_inicio);
            const reservaFin = convertToMinutes(reserva.hora_fin);
            
            if (horaInicioMinutos < reservaFin && horaFinMinutos > reservaInicio) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error en checkDisponibilidad:', error);
        throw new Error('Error al verificar disponibilidad: ' + error.message);
    }
};

// Funciones auxiliares para Reservas
function formatFecha(fecha) {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
}

function formatHora(hora) {
    if (!hora) return '';
    return hora.slice(0, 5);
}

function convertToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Servicio para Salas
const salasRef = db.ref('salas');

const getAllSalas = async () => {
  try {
    const snapshot = await salasRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error('Error al obtener salas: ' + error.message);
  }
};

const getSalaById = async (id) => {
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

const createSala = async (salaData) => {
  try {
    if (!salaData.nombre || !salaData.capacidad) {
      throw new Error('Nombre y capacidad son campos requeridos');
    }
    
    const docRef = await salasRef.add({
      ...salaData,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    });
    return { id: docRef.id, ...salaData };
  } catch (error) {
    throw new Error('Error al crear sala: ' + error.message);
  }
};

const updateSala = async (id, salaData) => {
  try {
    await salasRef.doc(id).update({
      ...salaData,
      actualizado_en: new Date().toISOString()
    });
    return { id, ...salaData };
  } catch (error) {
    throw new Error('Error al actualizar sala: ' + error.message);
  }
};

const deleteSala = async (id) => {
  try {
    await salasRef.doc(id).delete();
    return true;
  } catch (error) {
    throw new Error('Error al eliminar sala: ' + error.message);
  }
};

// Servicio para Usuarios
const usuariosRef = db.ref('usuarios');

const getAll = async () => {
  const snapshot = await db.ref('usuarios').once('value');
  const usuarios = snapshot.val() || {};
  return Object.entries(usuarios).map(([id, datos]) => ({ id, ...datos }));
};

const create = async ({ nombre, correo }) => {
  const nuevoUsuario = {
    nombre,
    correo,
    timestamp: Date.now()
  };

  const usuariosRef = db.ref('usuarios');
  const nuevaRef = usuariosRef.push();
  await nuevaRef.set(nuevoUsuario);

  return { id: nuevaRef.key, ...nuevoUsuario };
};

const getById = async (id) => {
  const snapshot = await db.ref(`usuarios/${id}`).once('value');
  const usuario = snapshot.val();
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }
  return { id, ...usuario };
};

module.exports = {
  getAll,
  create,
  getById 
};