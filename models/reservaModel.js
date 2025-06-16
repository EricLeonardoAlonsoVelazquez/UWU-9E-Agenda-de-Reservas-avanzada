const db = require('../config/firebaseConfig');
const reservasRef = db.collection('reservas');

const getAll = async () => {
    try {
        const snapshot = await reservasRef.get();
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Formatear fechas para mejor visualización
            fecha_formateada: formatFecha(doc.data().fecha),
            hora_inicio_formateada: formatHora(doc.data().hora_inicio),
            hora_fin_formateada: formatHora(doc.data().hora_fin)
        }));
    } catch (error) {
        console.error('Error en getAll:', error);
        throw new Error('Error al obtener todas las reservas: ' + error.message);
    }
};

const getById = async (id) => {
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
        console.error('Error en getById:', error);
        throw new Error('Error al obtener reserva por ID: ' + error.message);
    }
};

const create = async (reservaData) => {
    try {
        // Validar campos requeridos
        const requiredFields = ['usuario_id', 'sala_id', 'fecha', 'hora_inicio', 'hora_fin'];
        const missingFields = requiredFields.filter(field => !reservaData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
        }

        // Validar formato de fecha y hora
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reservaData.fecha)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reservaData.hora_inicio) || 
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reservaData.hora_fin)) {
            throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
        }

        // Añadir timestamps
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
        console.error('Error en create:', error);
        throw new Error('Error al crear reserva: ' + error.message);
    }
};

const update = async (id, reservaData) => {
    try {
        // Validar que la reserva existe
        const reserva = await getById(id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }

        // Preparar datos para actualizar
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
        console.error('Error en update:', error);
        throw new Error('Error al actualizar reserva: ' + error.message);
    }
};

const remove = async (id) => {
    try {
        await reservasRef.doc(id).delete();
        return true;
    } catch (error) {
        console.error('Error en remove:', error);
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const getBySalaAndDate = async (salaId, fecha) => {
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
        console.error('Error en getBySalaAndDate:', error);
        throw new Error('Error al obtener reservas por sala y fecha: ' + error.message);
    }
};

// Funciones auxiliares para formateo
function formatFecha(fecha) {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
}

function formatHora(hora) {
    if (!hora) return '';
    return hora.slice(0, 5); // Asegura formato HH:MM
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    getBySalaAndDate
};