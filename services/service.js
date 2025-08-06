const repository = require('../repository/repository');
const { auth } = require('../config/firebaseConfig');

const handleServiceError = (error, defaultMessage) => {
    if (error.message.includes('email-already-exists')) {
        return 'El email ya está registrado';
    } else if (error.message.includes('invalid-email')) {
        return 'Formato de email inválido';
    } else if (error.message.includes('weak-password')) {
        return 'La contraseña debe tener al menos 6 caracteres';
    } else if (error.message.includes('user-not-found')) {
        return 'Usuario no registrado';
    } else if (error.message.includes('wrong-password')) {
        return 'Contraseña incorrecta';
    }
    return defaultMessage || error.message;
};

const registerUser = async (nombre, email, password) => {
    if (!nombre || !email || !password) {
        throw new Error('Todos los campos son requeridos');
    }
    
    if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    try {
        return await repository.registerUser(nombre, email, password);
    } catch (error) {
        throw new Error(handleServiceError(error, 'Error en el registro'));
    }
};

const loginUser = async (email, password) => {
    if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
    }
    
    try {
        return await repository.loginUser(email, password);
    } catch (error) {
        throw new Error(handleServiceError(error, 'Error en el inicio de sesión'));
    }
};

const crearReserva = async (usuarioId, reservaData) => {
    const { sala_id, fecha, hora_inicio, hora_fin } = reservaData;
    
    if (!sala_id || !fecha || !hora_inicio || !hora_fin) {
        throw new Error('Todos los campos son requeridos');
    }
    
    if (hora_inicio >= hora_fin) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }
    
    const disponible = await repository.verificarDisponibilidad(
        sala_id, fecha, hora_inicio, hora_fin
    );
    
    if (!disponible) {
        throw new Error('La sala no está disponible en ese horario');
    }
    
    try {
        const result = await repository.crearReserva({
            sala_id,
            fecha,
            hora_inicio,
            hora_fin,
            usuario_id: usuarioId
        });

        return { id: result.id };
    } catch (error) {
        throw new Error('Error al crear reserva: ' + error.message);
    }
};

const cancelarReserva = async (reservaId, usuarioId) => {
    try {
        const reserva = await repository.obtenerReservaPorId(reservaId);
        
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        
        if (reserva.usuario_id !== usuarioId) {
            throw new Error('No tienes permiso para cancelar esta reserva');
        }
        
        if (reserva.estado !== 'pendiente') {
            throw new Error('Solo se pueden cancelar reservas pendientes');
        }

        const reservaActualizada = await repository.actualizarEstadoReserva(reservaId, 'cancelada');
        
        const usuario = await repository.obtenerUsuario(usuarioId);
        
        let sala = null;
        try {
            sala = await repository.obtenerSalaPorId(reserva.sala_id);
        } catch (error) {
            sala = { 
                nombre: reserva.sala_nombre || 'Sala Desconocida',
                capacidad: reserva.sala_capacidad || 'N/A',
                equipamiento: reserva.sala_equipamiento || ''
            };
        }

        return {
            reserva: reservaActualizada,
            usuario,
            sala
        };
    } catch (error) {
        throw new Error('Error al cancelar reserva: ' + error.message);
    }
};

const confirmarReserva = async (reservaId, usuarioId) => {
    try {
        const reserva = await repository.obtenerReservaPorId(reservaId);
        
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        
        if (reserva.usuario_id !== usuarioId) {
            throw new Error('No tienes permiso para confirmar esta reserva');
        }
        
        if (reserva.estado !== 'pendiente') {
            throw new Error('Solo se pueden confirmar reservas pendientes');
        }

        const reservaActualizada = await repository.actualizarEstadoReserva(reservaId, 'confirmada');
        
        const usuario = await repository.obtenerUsuario(usuarioId);
        
        let sala = null;
        try {
            sala = await repository.obtenerSalaPorId(reserva.sala_id);
        } catch (error) {
            sala = { 
                nombre: reserva.sala_nombre || 'Sala Desconocida',
                capacidad: reserva.sala_capacidad || 'N/A',
                equipamiento: reserva.sala_equipamiento || ''
            };
        }

        return {
            reserva: reservaActualizada,
            usuario,
            sala
        };
    } catch (error) {
        throw new Error('Error al confirmar reserva: ' + error.message);
    }
};

const obtenerReservasUsuario = async (usuarioId) => {
    try {
        return await repository.obtenerReservasPorUsuario(usuarioId);
    } catch (error) {
        throw new Error('Error al obtener reservas: ' + error.message);
    }
};

const obtenerSalas = async () => {
    try {
        return await repository.obtenerSalas();
    } catch (error) {
        throw new Error('Error al obtener salas: ' + error.message);
    }
};

const obtenerSala = async (salaId) => {
    try {
        return await repository.obtenerSalaPorId(salaId);
    } catch (error) {
        throw new Error('Error al obtener sala: ' + error.message);
    }
};

const obtenerDisponibilidad = async (salaId, yearMonth) => {
    if (!salaId || salaId === 'none') return {};
    
    const [year, month] = yearMonth.split('-').map(Number);
    try {
        return await repository.obtenerDisponibilidadPorMes(salaId, year, month);
    } catch (error) {
        throw new Error('Error al obtener disponibilidad: ' + error.message);
    }
};

const obtenerDisponibilidadHoraria = async (salaId, fecha) => {
    try {
        return await repository.obtenerDisponibilidadHorariaPorDia(salaId, fecha);
    } catch (error) {
        throw new Error('Error al obtener disponibilidad horaria: ' + error.message);
    }
};

const crearSala = async (salaData) => {
    try {
        return await repository.crearSala(salaData);
    } catch (error) {
        throw new Error('Error al crear sala: ' + error.message);
    }
};

const actualizarSala = async (salaId, salaData) => {
    try {
        return await repository.actualizarSala(salaId, salaData);
    } catch (error) {
        throw new Error('Error al actualizar sala: ' + error.message);
    }
};

const eliminarSala = async (salaId) => {
    try {
        return await repository.eliminarSala(salaId);
    } catch (error) {
        throw new Error('Error al eliminar sala: ' + error.message);
    }
};

const obtenerTodosUsuarios = async () => {
    try {
        return await repository.obtenerTodosUsuarios();
    } catch (error) {
        throw new Error('Error al obtener usuarios: ' + error.message);
    }
};

const actualizarUsuario = async (usuarioId, usuarioData) => {
    try {
        if (usuarioData.password) {
            await auth.updateUser(usuarioId, {
                password: usuarioData.password
            });
        }
        
        return await repository.actualizarUsuario(usuarioId, {
            nombre: usuarioData.nombre,
            email: usuarioData.email,
            role: usuarioData.role,
            status: usuarioData.status
        });
    } catch (error) {
        throw new Error('Error al actualizar usuario: ' + error.message);
    }
};

const eliminarUsuario = async (usuarioId) => {
    try {
        return await repository.eliminarUsuario(usuarioId);
    } catch (error) {
        throw new Error('Error al eliminar usuario: ' + error.message);
    }
};

const obtenerTodasReservas = async () => {
    try {
        return await repository.obtenerTodasReservas();
    } catch (error) {
        throw new Error('Error al obtener reservas: ' + error.message);
    }
};

const eliminarReserva = async (reservaId) => {
    try {
        return await repository.eliminarReserva(reservaId);
    } catch (error) {
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const obtenerUsuario = async (usuarioId) => {
    try {
        return await repository.obtenerUsuario(usuarioId);
    } catch (error) {
        throw new Error('Error al obtener usuario: ' + error.message);
    }
};



module.exports = { 
    registerUser,
    loginUser,
    crearReserva,
    obtenerReservasUsuario,
    obtenerSalas,
    obtenerSala,
    cancelarReserva,
    confirmarReserva,
    obtenerDisponibilidad,
    obtenerDisponibilidadHoraria,
    crearSala,
    actualizarSala,
    eliminarSala,
    obtenerTodosUsuarios,
    actualizarUsuario,
    eliminarUsuario,
    obtenerTodasReservas,
    eliminarReserva,
    obtenerUsuario
};