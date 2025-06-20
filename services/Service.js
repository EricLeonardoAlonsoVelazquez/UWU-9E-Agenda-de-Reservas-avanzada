const reservaModel = require('../models/Model');
const usuarioModel = require('../models/Model');
const salaModel = require('../models/Model');

const enviarEmail = (correo, asunto, mensaje) => {
    console.log(`[Email simulado] Para: ${correo}`);
    console.log(`Asunto: ${asunto}`);
    console.log(`Cuerpo: ${mensaje}\n`);
    return Promise.resolve();
};

const validarHorario = (hora) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(hora)) {
        throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
    }
    return true;
};

const validarFecha = (fecha) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
        throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }
    return true;
};

// Servicio de Reservas
const ReservaService = {
    getAllReservas: async () => {
        try {
            return await reservaModel.getAll();
        } catch (error) {
            throw new Error('Error al obtener todas las reservas: ' + error.message);
        }
    },

    getReservaById: async (id) => {
        try {
            const reserva = await reservaModel.getById(id);
            if (!reserva) {
                throw new Error('Reserva no encontrada');
            }
            return reserva;
        } catch (error) {
            throw new Error('Error al obtener reserva por ID: ' + error.message);
        }
    },

    createReserva: async (reservaData) => {
        try {
            console.log('Datos recibidos para reserva:', reservaData);
            
            const { usuario_id, sala_id, fecha, hora_inicio, hora_fin } = reservaData;
            
            if (!usuario_id || !sala_id || !fecha || !hora_inicio || !hora_fin) {
                throw new Error('Faltan campos obligatorios: usuario_id, sala_id, fecha, hora_inicio o hora_fin');
            }

            validarFecha(fecha);
            validarHorario(hora_inicio);
            validarHorario(hora_fin);

            const usuario = await usuarioModel.getById(usuario_id);
            if (!usuario) {
                throw new Error(`Usuario con ID ${usuario_id} no encontrado`);
            }

            const sala = await salaModel.getById(sala_id);
            if (!sala) {
                throw new Error(`Sala con ID ${sala_id} no encontrada`);
            }

            const disponible = await ReservaService.checkDisponibilidad(sala_id, fecha, hora_inicio, hora_fin);
            if (!disponible) {
                throw new Error(`La sala ${sala_id} no está disponible el ${fecha} de ${hora_inicio} a ${hora_fin}`);
            }

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
    },

    updateReserva: async (id, reservaData) => {
        try {
            const reservaExistente = await ReservaService.getReservaById(id);

            if (reservaExistente.estado === 'confirmada') {
                throw new Error('No se puede modificar una reserva confirmada');
            }

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

                const disponible = await ReservaService.checkDisponibilidad(
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
    },

    deleteReserva: async (id) => {
        try {
            const reserva = await ReservaService.getReservaById(id);
            
            if (reserva.estado === 'confirmada') {
                throw new Error('No se puede cancelar una reserva confirmada');
            }

            await reservaModel.remove(id);
            
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
    },

    checkDisponibilidad: async (salaId, fecha, horaInicio, horaFin, excludeReservaId = null) => {
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
    },

    getReservasBySalaAndDate: async (salaId, fecha) => {
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
    }
};

// Servicio de Salas
const SalaService = {
    getAllSalas: async () => {
        return await salaModel.getAll();
    },

    getSalaById: async (id) => {
        const sala = await salaModel.getById(id);
        if (!sala) {
            throw new Error('Sala no encontrada');
        }
        return sala;
    },

    createSala: async (salaData) => {
        if (!salaData.nombre || !salaData.capacidad) {
            throw new Error('Nombre y capacidad son requeridos');
        }
        if (salaData.capacidad <= 0) {
            throw new Error('La capacidad debe ser mayor a 0');
        }

        return await salaModel.create(salaData);
    },

    updateSala: async (id, salaData) => {
        await SalaService.getSalaById(id);
        return await salaModel.update(id, salaData);
    },

    deleteSala: async (id) => {
        const sala = await SalaService.getSalaById(id);
        
        const reservas = await reservaModel.getBySalaAndDate(id, new Date().toISOString().split('T')[0]);
        if (reservas.length > 0) {
            throw new Error('No se puede eliminar una sala con reservas futuras');
        }
        
        return await salaModel.remove(id);
    }
};

// Servicio de Usuarios
const UsuarioService = {
    getAllUsuarios: async () => {
        return await usuarioModel.getAll();
    },

    getUsuarioById: async (id) => {
        const usuario = await usuarioModel.getById(id);
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }
        return usuario;
    },

    createUsuario: async (usuarioData) => {
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
    },

    updateUsuario: async (id, usuarioData) => {
        await UsuarioService.getUsuarioById(id);
        return await usuarioModel.update(id, usuarioData);
    },

    deleteUsuario: async (id) => {
        await UsuarioService.getUsuarioById(id);

        const reservas = await reservaModel.getAll();
        const usuarioTieneReservas = reservas.some(r => r.usuario_id === id);
        if (usuarioTieneReservas) {
            throw new Error('No se puede eliminar un usuario con reservas activas');
        }
        
        return await usuarioModel.remove(id);
    }
};

module.exports = {
    ReservaService,
    SalaService,
    UsuarioService,
    enviarEmail,
    validarHorario,
    validarFecha
};