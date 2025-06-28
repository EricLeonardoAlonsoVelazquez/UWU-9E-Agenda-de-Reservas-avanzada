const bcrypt = require('bcryptjs');
const reservaModel = require('../repository/repository');
const usuarioModel = require('../repository/repository');
const salaModel = require('../repository/repository');

// Funciones de utilidad compartidas
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
            return await reservaModel.getAllReservas();
        } catch (error) {
            throw new Error('Error al obtener todas las reservas: ' + error.message);
        }
    },

    getReservaById: async (id) => {
        try {
            const reserva = await reservaModel.getReservaById(id);
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

            const usuario = await UsuarioService.getUsuarioById(usuario_id);
            if (!usuario) {
                throw new Error(`Usuario con ID ${usuario_id} no encontrado`);
            }

            const sala = await SalaService.getSalaById(sala_id);
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
            const nuevaReserva = await reservaModel.createReserva(reservaCompleta);
            
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

                const disponible = await ReservaService.checkDisponibility(
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

            return await reservaModel.updateReserva(id, reservaData);
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

            await reservaModel.deleteReserva(id);
            
            const usuario = await UsuarioService.getUsuarioById(reserva.usuario_id);
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

            if (horaInicio >= horaFin) {
                throw new Error('La hora de inicio debe ser anterior a la hora de fin');
            }

            const reservas = await reservaModel.getReservasBySalaAndDate(salaId, fecha);
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
            
            const reservas = await reservaModel.getReservasBySalaAndDate(salaId, fecha);
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
        try {
            return await salaModel.getAllSalas();
        } catch (error) {
            throw new Error('Error al obtener salas: ' + error.message);
        }
    },

    getSalaById: async (id) => {
        try {
            const sala = await salaModel.getSalaById(id);
            if (!sala) {
                throw new Error('Sala no encontrada');
            }
            return sala;
        } catch (error) {
            throw new Error('Error al obtener sala: ' + error.message);
        }
    },

    createSala: async (salaData) => {
        try {
            if (!salaData.nombre || !salaData.capacidad) {
                throw new Error('Nombre y capacidad son requeridos');
            }
            if (salaData.capacidad <= 0) {
                throw new Error('La capacidad debe ser mayor a 0');
            }

            return await salaModel.createSala(salaData);
        } catch (error) {
            throw new Error('Error al crear sala: ' + error.message);
        }
    },

    updateSala: async (id, salaData) => {
        try {
            await SalaService.getSalaById(id);
            return await salaModel.updateSala(id, salaData);
        } catch (error) {
            throw new Error('Error al actualizar sala: ' + error.message);
        }
    },

    deleteSala: async (id) => {
        try {
            const sala = await SalaService.getSalaById(id);
            
            // Verificar si la sala tiene reservas futuras
            const reservas = await reservaModel.getReservasBySalaAndDate(id, new Date().toISOString().split('T')[0]);
            if (reservas.length > 0) {
                throw new Error('No se puede eliminar una sala con reservas futuras');
            }
            
            return await salaModel.deleteSala(id);
        } catch (error) {
            throw new Error('Error al eliminar sala: ' + error.message);
        }
    }
};

// Servicio de Usuarios
const UsuarioService = {
    getAllUsuarios: async () => {
        try {
            return await usuarioModel.getAllUsuarios();
        } catch (error) {
            throw new Error('Error al obtener usuarios: ' + error.message);
        }
    },

    getUsuarioById: async (id) => {
        try {
            const usuario = await usuarioModel.getUsuarioById(id);
            if (!usuario) {
                throw new Error('Usuario no encontrado');
            }
            return {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol || 'usuario'
            };
        } catch (error) {
            throw new Error('Error al obtener usuario: ' + error.message);
        }
    },

    autenticarUsuario: async (correo, password) => {
        try {
            const usuarios = await usuarioModel.getAllUsuarios();
            const usuario = usuarios.find(u => u.correo === correo);
            
            if (!usuario) {
                return null;
            }
            
            // Comparar contraseñas (en producción usar bcrypt.compare)
            if (usuario.password !== password) {
                return null;
            }
            
            return {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol || 'usuario'
            };
        } catch (error) {
            throw new Error('Error al autenticar usuario: ' + error.message);
        }
    },

    createUsuario: async (usuarioData) => {
        try {
            if (!usuarioData.nombre || !usuarioData.correo || !usuarioData.password) {
                throw new Error('Nombre, correo y contraseña son requeridos');
            }

            const usuarios = await usuarioModel.getAllUsuarios();
            const correoExiste = usuarios.some(u => u.correo === usuarioData.correo);
            if (correoExiste) {
                throw new Error('El correo ya está registrado');
            }

            // En producción, hashear la contraseña:
            // const hashedPassword = await bcrypt.hash(usuarioData.password, 10);
            const nuevoUsuario = {
                nombre: usuarioData.nombre,
                correo: usuarioData.correo,
                password: usuarioData.password, // En producción usar hashedPassword
                rol: usuarioData.rol || 'usuario',
                creado_en: new Date().toISOString()
            };

            const usuarioCreado = await usuarioModel.createUsuario(nuevoUsuario);
            
            return {
                id: usuarioCreado.id,
                nombre: usuarioCreado.nombre,
                correo: usuarioCreado.correo,
                rol: usuarioCreado.rol || 'usuario'
            };
        } catch (error) {
            throw new Error('Error al crear usuario: ' + error.message);
        }
    },

    updateUsuario: async (id, usuarioData) => {
        try {
            await UsuarioService.getUsuarioById(id);
            
            if (usuarioData.password) {
                // En producción, hashear la nueva contraseña
                // usuarioData.password = await bcrypt.hash(usuarioData.password, 10);
            }
            
            return await usuarioModel.updateUsuario(id, usuarioData);
        } catch (error) {
            throw new Error('Error al actualizar usuario: ' + error.message);
        }
    },

    deleteUsuario: async (id) => {
        try {
            await UsuarioService.getUsuarioById(id);
            
            // Verificar si el usuario tiene reservas
            const reservas = await reservaModel.getAllReservas();
            const usuarioTieneReservas = reservas.some(r => r.usuario_id === id);
            if (usuarioTieneReservas) {
                throw new Error('No se puede eliminar un usuario con reservas activas');
            }
            
            return await usuarioModel.deleteUsuario(id);
        } catch (error) {
            throw new Error('Error al eliminar usuario: ' + error.message);
        }
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