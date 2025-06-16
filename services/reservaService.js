const reservaModel = require('../models/reservaModel');
const usuarioModel = require('../models/usuarioModel');
const salaModel = require('../models/salaModel');

// Función para enviar emails simulados
const enviarEmail = (correo, asunto, mensaje) => {
    console.log(`[Email simulado] Para: ${correo}`);
    console.log(`Asunto: ${asunto}`);
    console.log(`Cuerpo: ${mensaje}\n`);
    return Promise.resolve();
};

// Validar formato de hora (HH:MM)
const validarHorario = (hora) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(hora)) {
        throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
    }
    return true;
};

// Validar formato de fecha (YYYY-MM-DD)
const validarFecha = (fecha) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
        throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }
    return true;
};

const getAllReservas = async () => {
    try {
        return await reservaModel.getAll();
    } catch (error) {
        throw new Error('Error al obtener todas las reservas: ' + error.message);
    }
};

const getReservaById = async (id) => {
    try {
        const reserva = await reservaModel.getById(id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        return reserva;
    } catch (error) {
        throw new Error('Error al obtener reserva por ID: ' + error.message);
    }
};

const createReserva = async (reservaData) => {
    try {
        console.log('Datos recibidos para reserva:', reservaData); // Log para depuración
        
        const { usuario_id, sala_id, fecha, hora_inicio, hora_fin } = reservaData;
        
        // Validación de campos requeridos
        if (!usuario_id || !sala_id || !fecha || !hora_inicio || !hora_fin) {
            throw new Error('Faltan campos obligatorios: usuario_id, sala_id, fecha, hora_inicio o hora_fin');
        }

        // Validación de formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        // Validación de formato de hora
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(hora_inicio) || !timeRegex.test(hora_fin)) {
            throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
        }

        // Verificar que usuario existe
        const usuario = await usuarioModel.getById(usuario_id);
        if (!usuario) {
            throw new Error(`Usuario con ID ${usuario_id} no encontrado`);
        }

        // Verificar que sala existe
        const sala = await salaModel.getById(sala_id);
        if (!sala) {
            throw new Error(`Sala con ID ${sala_id} no encontrada`);
        }

        // Verificar disponibilidad
        const disponible = await checkDisponibilidad(sala_id, fecha, hora_inicio, hora_fin);
        if (!disponible) {
            throw new Error(`La sala ${sala_id} no está disponible el ${fecha} de ${hora_inicio} a ${hora_fin}`);
        }

        // Crear objeto de reserva bien formado
        const reservaCompleta = {
            usuario_id,
            sala_id,
            fecha,
            hora_inicio,
            hora_fin,
            estado: 'pendiente',
            creado_en: new Date().toISOString()
        };

        console.log('Creando reserva con datos:', reservaCompleta);
        const nuevaReserva = await reservaModel.create(reservaCompleta);
        
        return nuevaReserva;
    } catch (error) {
        console.error('Error en createReserva:', error);
        throw new Error(`Error al crear reserva: ${error.message}`);
    }
};

const updateReserva = async (id, reservaData) => {
    try {
        const reservaExistente = await getReservaById(id);

        if (reservaExistente.estado === 'confirmada') {
            throw new Error('No se puede modificar una reserva confirmada');
        }

        // Validar cambios en fecha/hora
        if (reservaData.fecha || reservaData.hora_inicio || reservaData.hora_fin) {
            const fecha = reservaData.fecha || reservaExistente.fecha;
            const hora_inicio = reservaData.hora_inicio || reservaExistente.hora_inicio;
            const hora_fin = reservaData.hora_fin || reservaExistente.hora_fin;

            validarFecha(fecha);
            validarHorario(hora_inicio);
            validarHorario(hora_fin);

            if (hora_inicio >= hora_fin) {
                throw new Error('La hora de inicio debe ser anterior a la hora de fin');
            }

            const disponible = await checkDisponibilidad(
                reservaExistente.sala_id,
                fecha,
                hora_inicio,
                hora_fin,
                id
            );

            if (!disponible) {
                throw new Error('La sala no está disponible en el nuevo horario');
            }
        }

        return await reservaModel.update(id, reservaData);
    } catch (error) {
        throw new Error('Error al actualizar reserva: ' + error.message);
    }
};

const deleteReserva = async (id) => {
    try {
        const reserva = await getReservaById(id);
        
        if (reserva.estado === 'confirmada') {
            throw new Error('No se puede cancelar una reserva confirmada');
        }

        await reservaModel.remove(id);
        
        // Enviar email de cancelación
        const usuario = await usuarioModel.getById(reserva.usuario_id);
        if (usuario) {
            await enviarEmail(
                usuario.correo,
                'Reserva cancelada',
                `Hola ${usuario.nombre}, tu reserva para el ${reserva.fecha} ha sido cancelada.`
            );
        }
        
        return true;
    } catch (error) {
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const checkDisponibilidad = async (salaId, fecha, horaInicio, horaFin, excludeReservaId = null) => {
    try {
        validarFecha(fecha);
        validarHorario(horaInicio);
        validarHorario(horaFin);

        const reservas = await reservaModel.getBySalaAndDate(salaId, fecha);
        const reservasFiltradas = reservas.filter(reserva => 
            !excludeReservaId || reserva.id !== excludeReservaId
        );

        const nuevaInicio = new Date(`${fecha}T${horaInicio}`);
        const nuevaFin = new Date(`${fecha}T${horaFin}`);

        for (const reserva of reservasFiltradas) {
            const existenteInicio = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
            const existenteFin = new Date(`${reserva.fecha}T${reserva.hora_fin}`);

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
        throw new Error('Error al verificar disponibilidad: ' + error.message);
    }
};

const getReservasBySalaAndDate = async (salaId, fecha) => {
    try {
        validarFecha(fecha);
        
        const reservas = await reservaModel.getBySalaAndDate(salaId, fecha);
        return reservas.map(reserva => ({
            id: reserva.id,
            fecha: reserva.fecha,
            hora_inicio: reserva.hora_inicio,
            hora_fin: reserva.hora_fin,
            estado: reserva.estado
        }));
    } catch (error) {
        throw new Error('Error al obtener reservas por sala y fecha: ' + error.message);
    }
};

module.exports = {
    getAllReservas,
    getReservaById,
    createReserva,
    updateReserva,
    deleteReserva,
    checkDisponibilidad,
    getReservasBySalaAndDate
};