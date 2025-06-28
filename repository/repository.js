const { db } = require('../config/firebaseConfig'); // Importación corregida

// Funciones auxiliares compartidas
const formatFecha = (fecha) => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
};

const formatHora = (hora) => {
    if (!hora) return '';
    return hora.slice(0, 5); // Asegura formato HH:MM
};

const convertToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Referencias a la base de datos
const reservasRef = db.ref('reservas');
const salasRef = db.ref('salas');
const usuariosRef = db.ref('usuarios');

// Servicio para Reservas
const getAllReservas = async () => {
    try {
        const snapshot = await reservasRef.once('value');
        const reservas = snapshot.val() || {};
        return Object.entries(reservas).map(([id, reserva]) => ({
            id,
            ...reserva,
            fecha_formateada: formatFecha(reserva.fecha),
            hora_inicio_formateada: formatHora(reserva.hora_inicio),
            hora_fin_formateada: formatHora(reserva.hora_fin)
        }));
    } catch (error) {
        console.error('Error en getAllReservas:', error);
        throw new Error('Error al obtener todas las reservas: ' + error.message);
    }
};

const getReservaById = async (id) => {
    try {
        const snapshot = await reservasRef.child(id).once('value');
        const reserva = snapshot.val();
        if (!reserva) {
            return null;
        }
        return {
            id,
            ...reserva,
            fecha_formateada: formatFecha(reserva.fecha),
            hora_inicio_formateada: formatHora(reserva.hora_inicio),
            hora_fin_formateada: formatHora(reserva.hora_fin)
        };
    } catch (error) {
        console.error('Error en getReservaById:', error);
        throw new Error('Error al obtener reserva por ID: ' + error.message);
    }
};

const createReserva = async (reservaData) => {
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

        const nuevaRef = reservasRef.push();
        await nuevaRef.set(reservaConTimestamps);
        
        return {
            id: nuevaRef.key,
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
        // Validar que la reserva existe
        const reserva = await getReservaById(id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }

        // Preparar datos para actualizar
        const datosActualizados = {
            ...reservaData,
            actualizado_en: new Date().toISOString()
        };

        await reservasRef.child(id).update(datosActualizados);
        
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
        await reservasRef.child(id).remove();
        return true;
    } catch (error) {
        console.error('Error en deleteReserva:', error);
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const getReservasBySalaAndDate = async (salaId, fecha) => {
    try {
        const snapshot = await reservasRef.orderByChild('sala_id').equalTo(salaId).once('value');
        const reservas = snapshot.val() || {};
        
        return Object.entries(reservas)
            .filter(([_, reserva]) => reserva.fecha === fecha)
            .map(([id, reserva]) => ({
                id,
                ...reserva,
                fecha_formateada: formatFecha(reserva.fecha),
                hora_inicio_formateada: formatHora(reserva.hora_inicio),
                hora_fin_formateada: formatHora(reserva.hora_fin)
            }));
    } catch (error) {
        console.error('Error en getReservasBySalaAndDate:', error);
        throw new Error('Error al obtener reservas por sala y fecha: ' + error.message);
    }
};

const checkDisponibilidad = async (salaId, fecha, horaInicio, horaFin, excludeReservaId = null) => {
    try {
        // Validar formato de fecha y hora
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaInicio) || 
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaFin)) {
            throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
        }

        if (horaInicio >= horaFin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin');
        }

        const reservas = await getReservasBySalaAndDate(salaId, fecha);
        const reservasFiltradas = reservas.filter(reserva => 
            !excludeReservaId || reserva.id !== excludeReservaId
        );

        const nuevaInicio = convertToMinutes(horaInicio);
        const nuevaFin = convertToMinutes(horaFin);

        for (const reserva of reservasFiltradas) {
            const existenteInicio = convertToMinutes(reserva.hora_inicio);
            const existenteFin = convertToMinutes(reserva.hora_fin);

            if (
                (nuevaInicio >= existenteInicio && nuevaInicio < existenteFin) ||
                (nuevaFin > existenteInicio && nuevaFin <= existenteFin) ||
                (nuevaInicio <= existenteInicio && nuevaFin >= existenteFin)
            ) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error en checkDisponibilidad:', error);
        throw new Error('Error al verificar disponibilidad: ' + error.message);
    }
};

// Servicio para Salas
const getAllSalas = async () => {
    try {
        const snapshot = await salasRef.once('value');
        const salas = snapshot.val() || {};
        return Object.entries(salas).map(([id, sala]) => ({ id, ...sala }));
    } catch (error) {
        console.error('Error en getAllSalas:', error);
        throw new Error('Error al obtener salas: ' + error.message);
    }
};

const getSalaById = async (id) => {
    try {
        const snapshot = await salasRef.child(id).once('value');
        const sala = snapshot.val();
        if (!sala) {
            return null;
        }
        return { id, ...sala };
    } catch (error) {
        console.error('Error en getSalaById:', error);
        throw new Error('Error al obtener sala: ' + error.message);
    }
};

const createSala = async (salaData) => {
    try {
        // Validación básica
        if (!salaData.nombre || !salaData.capacidad) {
            throw new Error('Nombre y capacidad son campos requeridos');
        }
        if (salaData.capacidad <= 0) {
            throw new Error('La capacidad debe ser mayor a 0');
        }

        const nuevaRef = salasRef.push();
        await nuevaRef.set({
            ...salaData,
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString()
        });
        
        return { id: nuevaRef.key, ...salaData };
    } catch (error) {
        console.error('Error en createSala:', error);
        throw new Error('Error al crear sala: ' + error.message);
    }
};

const updateSala = async (id, salaData) => {
    try {
        await salasRef.child(id).update({
            ...salaData,
            actualizado_en: new Date().toISOString()
        });
        return { id, ...salaData };
    } catch (error) {
        console.error('Error en updateSala:', error);
        throw new Error('Error al actualizar sala: ' + error.message);
    }
};

const deleteSala = async (id) => {
    try {
        await salasRef.child(id).remove();
        return true;
    } catch (error) {
        console.error('Error en deleteSala:', error);
        throw new Error('Error al eliminar sala: ' + error.message);
    }
};

// Servicio para Usuarios
const getAllUsuarios = async () => {
    try {
        const snapshot = await usuariosRef.once('value');
        const usuarios = snapshot.val() || {};
        return Object.entries(usuarios).map(([id, usuario]) => ({ id, ...usuario }));
    } catch (error) {
        console.error('Error en getAllUsuarios:', error);
        throw new Error('Error al obtener usuarios: ' + error.message);
    }
};

const getUsuarioById = async (id) => {
    try {
        const snapshot = await usuariosRef.child(id).once('value');
        const usuario = snapshot.val();
        if (!usuario) {
            return null;
        }
        return { id, ...usuario };
    } catch (error) {
        console.error('Error en getUsuarioById:', error);
        throw new Error('Error al obtener usuario: ' + error.message);
    }
};

const createUsuario = async (usuarioData) => {
    try {
        if (!usuarioData.nombre || !usuarioData.correo || !usuarioData.uid) {
            throw new Error('Nombre, correo y uid son requeridos');
        }

        // Verificar si el usuario ya existe
        const snapshot = await usuariosRef.orderByChild('correo').equalTo(usuarioData.correo).once('value');
        if (snapshot.exists()) {
            throw new Error('El correo ya está registrado');
        }

        const nuevoUsuario = {
            nombre: usuarioData.nombre,
            correo: usuarioData.correo,
            rol: usuarioData.rol || 'usuario',
            uid: usuarioData.uid,
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString()
        };

        await usuariosRef.child(usuarioData.uid).set(nuevoUsuario);
        return { id: usuarioData.uid, ...nuevoUsuario };
    } catch (error) {
        console.error('Error en createUsuario:', error);
        throw new Error('Error al crear usuario: ' + error.message);
    }
};

const updateUsuario = async (id, usuarioData) => {
    try {
        await usuariosRef.child(id).update({
            ...usuarioData,
            actualizado_en: new Date().toISOString()
        });
        return { id, ...usuarioData };
    } catch (error) {
        console.error('Error en updateUsuario:', error);
        throw new Error('Error al actualizar usuario: ' + error.message);
    }
};

const deleteUsuario = async (id) => {
    try {
        await usuariosRef.child(id).remove();
        return true;
    } catch (error) {
        console.error('Error en deleteUsuario:', error);
        throw new Error('Error al eliminar usuario: ' + error.message);
    }
};

module.exports = {
    // Reservas
    getAllReservas,
    getReservaById,
    createReserva,
    updateReserva,
    deleteReserva,
    getReservasBySalaAndDate,
    checkDisponibilidad,
    
    // Salas
    getAllSalas,
    getSalaById,
    createSala,
    updateSala,
    deleteSala,
    
    // Usuarios
    getAllUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    
    // Funciones auxiliares
    formatFecha,
    formatHora,
    convertToMinutes
};