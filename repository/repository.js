const { db, auth, authClient, signInWithEmailAndPassword } = require('../config/firebaseConfig');

const registerUser = async (nombre, email, password) => {
    try {
        const userRecord = await auth.createUser({ email, password, displayName: nombre });
        
        const userRef = db.ref('users/' + userRecord.uid);
        await userRef.set({
            nombre,
            email,
            createdAt: new Date().toISOString(),
            role: 'Usuario',
            status: 'active'
        });
        
        return { 
            uid: userRecord.uid, 
            email: userRecord.email, 
            nombre: userRecord.displayName,
            role: 'Usuario'
        };
    } catch (error) {
        console.error("Error en Firebase:", error);
        throw error;
    }
};

const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(authClient, email, password);
        const user = userCredential.user;
        const idToken = await user.getIdToken();
        
        const userRef = db.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        
        if (!userData) throw new Error('Usuario no encontrado en la base de datos');
        
        return {
            user: { 
                uid: user.uid, 
                nombre: userData.nombre, 
                email: user.email,
                role: userData.role
            },
            idToken
        };
    } catch (error) {
        console.error("Error en Firebase:", error);
        throw error;
    }
};

const crearReserva = async (reservaData) => {
    try {
        // Primero obtener los datos de la sala
        const sala = await obtenerSalaPorId(reservaData.sala_id);
        
        const reservasRef = db.ref('reservas');
        const nuevaReservaRef = reservasRef.push();
        
        await nuevaReservaRef.set({
            ...reservaData,
            sala_nombre: sala.nombre,
            sala_capacidad: sala.capacidad,
            sala_equipamiento: sala.equipamiento || '',
            estado: 'pendiente',
            createdAt: new Date().toISOString()
        });
        
        return { id: nuevaReservaRef.key, ...reservaData };
    } catch (error) {
        throw new Error('Error al crear la reserva: ' + error.message);
    }
};

const obtenerReservaPorId = async (reservaId) => {
    try {
        const reservaRef = db.ref(`reservas/${reservaId}`);
        const snapshot = await reservaRef.once('value');
        const reserva = snapshot.val();
        
        if (!reserva) {
            throw new Error(`Reserva no encontrada ID: ${reservaId}`);
        }
        
        return { id: reservaId, ...reserva };
    } catch (error) {
        console.error(`Error al obtener reserva ${reservaId}:`, error);
        throw new Error('Error al obtener reserva: ' + error.message);
    }
};

const actualizarEstadoReserva = async (reservaId, nuevoEstado) => {
    try {
        const reservaRef = db.ref(`reservas/${reservaId}`);
        await reservaRef.update({ estado: nuevoEstado });
        const snapshot = await reservaRef.once('value');
        const reserva = snapshot.val();
        
        if (!reserva) {
            throw new Error(`Reserva no encontrada al actualizar: ${reservaId}`);
        }
        
        return { id: reservaId, ...reserva };
    } catch (error) {
        console.error(`Error actualizando reserva ${reservaId}:`, error);
        throw new Error(`Error al actualizar reserva: ${error.message}`);
    }
};

const obtenerReservasPorUsuario = async (usuarioId) => {
    try {
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('usuario_id')
            .equalTo(usuarioId)
            .once('value');
        
        const reservas = snapshot.val();
        
        if (!reservas) return [];
        
        return Object.keys(reservas).map(id => ({
            id,
            ...reservas[id]
        }));
    } catch (error) {
        throw new Error('Error al obtener reservas: ' + error.message);
    }
};

const verificarDisponibilidad = async (salaId, fecha, horaInicio, horaFin) => {
    try {
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('fecha')
            .equalTo(fecha)
            .once('value');
        
        const reservas = snapshot.val() || {};
        const reservasActivas = Object.values(reservas).filter(
            r => r.estado !== 'cancelada' && r.sala_id === salaId
        );

        const toMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const inicioMinutos = toMinutes(horaInicio);
        const finMinutos = toMinutes(horaFin);

        for (const reserva of reservasActivas) {
            const reservaInicio = toMinutes(reserva.hora_inicio);
            const reservaFin = toMinutes(reserva.hora_fin);
            
            if (inicioMinutos < reservaFin && finMinutos > reservaInicio) {
                return false;
            }
        }
        return true;
    } catch (error) {
        throw new Error('Error al verificar disponibilidad: ' + error.message);
    }
};

const obtenerSalas = async () => {
    try {
        const salasRef = db.ref('salas');
        const snapshot = await salasRef.once('value');
        const salas = snapshot.val();
        
        if (!salas) return [];
        
        return Object.keys(salas).map(id => ({
            id,
            ...salas[id]
        }));
    } catch (error) {
        throw new Error('Error al obtener salas: ' + error.message);
    }
};

const obtenerSalaPorId = async (salaId) => {
    try {
        const salaRef = db.ref(`salas/${salaId}`);
        const snapshot = await salaRef.once('value');
        const sala = snapshot.val();
        if (!sala) return null;
        return { id: salaId, ...sala };
    } catch (error) {
        throw new Error('Error al obtener sala: ' + error.message);
    }
};

const obtenerDisponibilidadPorMes = async (salaId, year, month) => {
    try {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('sala_id')
            .equalTo(salaId)
            .once('value');
        
        const reservas = snapshot.val() || {};
        const disponibilidad = {};
        
        Object.values(reservas).forEach(reserva => {
            if (reserva.estado !== 'cancelada') {
                const reservaDate = new Date(reserva.fecha);
                if (reservaDate.getMonth() + 1 === month && reservaDate.getFullYear() === year) {
                    const fechaKey = reserva.fecha;
                    disponibilidad[fechaKey] = (disponibilidad[fechaKey] || 0) + 1;
                }
            }
        });
        
        const resultado = {};
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const fechaKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const count = disponibilidad[fechaKey] || 0;
            resultado[fechaKey] = count === 16 ? 'ocupado' : count > 0 ? 'parcial' : 'libre';
        }
        
        return resultado;
    } catch (error) {
        throw new Error('Error al obtener disponibilidad: ' + error.message);
    }
};

const obtenerDisponibilidadHorariaPorDia = async (salaId, fecha) => {
    try {
        const horarios = {};
        for (let hora = 7; hora <= 22; hora++) {
            const horaStr = `${hora.toString().padStart(2, '0')}:00`;
            horarios[horaStr] = true;
        }
        
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('fecha')
            .equalTo(fecha)
            .once('value');
        
        const reservas = snapshot.val() || {};
        
        const toMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        
        Object.values(reservas).forEach(reserva => {
            if (reserva.estado !== 'cancelada' && reserva.sala_id === salaId) {
                const reservaInicio = toMinutes(reserva.hora_inicio);
                const reservaFin = toMinutes(reserva.hora_fin);
                
                for (let hora = 7; hora <= 22; hora++) {
                    const horaStr = `${hora.toString().padStart(2, '0')}:00`;
                    const horaInicioMin = toMinutes(horaStr);
                    
                    if (horaInicioMin >= reservaInicio && horaInicioMin < reservaFin) {
                        horarios[horaStr] = false;
                    }
                }
            }
        });
        
        return horarios;
    } catch (error) {
        throw new Error('Error al obtener disponibilidad horaria: ' + error.message);
    }
};

const crearSala = async (salaData) => {
    try {
        const salasRef = db.ref('salas');
        const nuevaSalaRef = salasRef.push();
        await nuevaSalaRef.set({
            ...salaData,
            createdAt: new Date().toISOString()
        });
        return { id: nuevaSalaRef.key, ...salaData };
    } catch (error) {
        throw new Error('Error al crear sala: ' + error.message);
    }
};

const actualizarSala = async (salaId, salaData) => {
    try {
        const salaRef = db.ref(`salas/${salaId}`);
        await salaRef.update(salaData);
        const snapshot = await salaRef.once('value');
        const sala = snapshot.val();
        if (!sala) return null;
        return { id: salaId, ...sala };
    } catch (error) {
        throw new Error('Error al actualizar sala: ' + error.message);
    }
};

const eliminarSala = async (salaId) => {
    try {
        // Obtener la sala primero para tener sus datos
        const sala = await obtenerSalaPorId(salaId);
        if (!sala) {
            throw new Error('Sala no encontrada');
        }

        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('sala_id')
            .equalTo(salaId)
            .once('value');
        
        const reservas = snapshot.val() || {};
        
        // Actualizar reservas asociadas
        const updatePromises = Object.keys(reservas).map(id => {
            return db.ref(`reservas/${id}`).update({
                sala_id: 'eliminada_' + salaId,
                sala_nombre: '[Sala Eliminada] ' + sala.nombre,
                estado: 'cancelada'
            });
        });
        
        await Promise.all(updatePromises);
        
        // Eliminar sala
        const salaRef = db.ref(`salas/${salaId}`);
        await salaRef.remove();
        
        return { id: salaId, message: 'Sala eliminada exitosamente' };
    } catch (error) {
        throw new Error('Error al eliminar sala: ' + error.message);
    }
};

const obtenerTodosUsuarios = async () => {
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');
        const usuarios = snapshot.val();
        
        if (!usuarios) return [];
        
        return Object.keys(usuarios).map(key => ({
            uid: key,
            ...usuarios[key]
        }));
    } catch (error) {
        throw new Error('Error al obtener usuarios: ' + error.message);
    }
};

const actualizarUsuario = async (usuarioId, usuarioData) => {
    try {
        const updates = {};
        if (usuarioData.nombre) updates.nombre = usuarioData.nombre;
        if (usuarioData.email) updates.email = usuarioData.email;
        if (usuarioData.role) updates.role = usuarioData.role;
        if (usuarioData.status) updates.status = usuarioData.status;
        
        const userRef = db.ref(`users/${usuarioId}`);
        await userRef.update(updates);
        
        const snapshot = await userRef.once('value');
        const usuario = snapshot.val();
        if (!usuario) return null;
        return { uid: usuarioId, ...usuario };
    } catch (error) {
        throw new Error('Error al actualizar usuario: ' + error.message);
    }
};

const eliminarUsuario = async (usuarioId) => {
    try {
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef
            .orderByChild('usuario_id')
            .equalTo(usuarioId)
            .once('value');
        
        const reservas = snapshot.val() || {};
        const deletePromises = Object.keys(reservas).map(id => 
            db.ref(`reservas/${id}`).remove()
        );
        
        await Promise.all(deletePromises);
        
        await auth.deleteUser(usuarioId);
        
        const userRef = db.ref(`users/${usuarioId}`);
        await userRef.remove();
        
        return { uid: usuarioId, message: 'Usuario eliminado exitosamente' };
    } catch (error) {
        throw new Error('Error al eliminar usuario: ' + error.message);
    }
};

const obtenerTodasReservas = async () => {
    try {
        const reservasRef = db.ref('reservas');
        const snapshot = await reservasRef.once('value');
        const reservas = snapshot.val();
        
        if (!reservas) return [];
        
        return Object.keys(reservas).map(id => {
            const reserva = reservas[id];
            return {
                id,
                ...reserva,
                sala_nombre: reserva.sala_nombre || 'Sala Desconocida',
                usuario_nombre: reserva.usuario_nombre || 'Usuario Desconocido'
            };
        });
    } catch (error) {
        throw new Error('Error al obtener reservas: ' + error.message);
    }
};

const eliminarReserva = async (reservaId) => {
    try {
        const reservaRef = db.ref(`reservas/${reservaId}`);
        await reservaRef.remove();
        return { id: reservaId, message: 'Reserva eliminada exitosamente' };
    } catch (error) {
        throw new Error('Error al eliminar reserva: ' + error.message);
    }
};

const obtenerUsuario = async (usuarioId) => {
    try {
        const userRef = db.ref(`users/${usuarioId}`);
        const snapshot = await userRef.once('value');
        const usuario = snapshot.val();
        if (!usuario) return null;
        return { uid: usuarioId, ...usuario };
    } catch (error) {
        throw new Error('Error al obtener usuario: ' + error.message);
    }
};



module.exports = {
    registerUser,
    loginUser,
    crearReserva,
    obtenerReservaPorId,
    actualizarEstadoReserva,
    obtenerReservasPorUsuario,
    obtenerSalas,
    obtenerSalaPorId,
    verificarDisponibilidad,
    obtenerDisponibilidadPorMes,
    obtenerDisponibilidadHorariaPorDia,
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