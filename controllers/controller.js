const authService = require('../services/service');
const reservaService = require('../services/service');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { auth } = require('../config/firebaseConfig');

// Configuración simple de transporte de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Función para enviar correo
const enviarCorreo = async (usuario, reserva, tipo) => {
  try {
    const asunto = tipo === 'confirmacion' 
      ? 'Confirmación de Reserva' 
      : 'Reserva Cancelada';
    
    const mensaje = tipo === 'confirmacion'
      ? `Hola ${usuario.nombre},\n\nTu reserva ha sido confirmada:\n\nSala: ${reserva.sala_nombre}\nFecha: ${reserva.fecha}\nHorario: ${reserva.hora_inicio} - ${reserva.hora_fin}\n\nGracias por usar nuestro servicio.`
      : `Hola ${usuario.nombre},\n\nTu reserva ha sido cancelada:\n\nSala: ${reserva.sala_nombre}\nFecha: ${reserva.fecha}\nHorario: ${reserva.hora_inicio} - ${reserva.hora_fin}\n\nSi tienes dudas, contáctanos.`;
    
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: usuario.email,
      subject: asunto,
      text: mensaje
    });
    
    console.log(`✅ Correo enviado a ${usuario.email}`);
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
  }
};

const register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        const user = await authService.registerUser(nombre, email, password);
        
        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            uid: user.uid,
            nombre: user.nombre
        });
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const { user, idToken } = await authService.loginUser(email, password);
        
        res.status(200).json({ 
            message: 'Inicio de sesión exitoso',
            uid: user.uid,
            nombre: user.nombre,
            token: idToken,
            role: user.role
        });
    } catch (error) {
        console.error('Error en inicio de sesión:', error.message);
        res.status(401).json({ error: error.message });
    }
};

const crearReserva = async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const result = await reservaService.crearReserva(usuarioId, req.body);
        
        res.status(201).json({
            message: 'Reserva creada exitosamente',
            reservaId: result.id
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerReservasUsuario = async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const reservas = await reservaService.obtenerReservasUsuario(usuarioId);
        res.status(200).json(reservas || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerSalas = async (req, res) => {
    try {
        const salas = await reservaService.obtenerSalas();
        res.status(200).json(salas || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerSala = async ( req, res) => {
    try {
        const sala = await reservaService.obtenerSala(req.params.id);
        if (!sala) {
            return res.status(404).json({ error: 'Sala no encontrada' });
        }
        res.status(200).json(sala);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const cancelarReserva = async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const reservaId = req.params.id;
        
        const result = await reservaService.cancelarReserva(reservaId, usuarioId);
        
        // Enviar correo de cancelación
        await enviarCorreo(result.usuario, {
            ...result.reserva,
            sala_nombre: result.sala ? result.sala.nombre : 'Sala Desconocida'
        }, 'cancelacion');
        
        res.status(200).json({ message: 'Reserva cancelada exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const confirmarReserva = async (req, res) => {
    try {
        const usuarioId = req.user.uid;
        const reservaId = req.params.id;
        
        const result = await reservaService.confirmarReserva(reservaId, usuarioId);
        
        // Enviar correo de confirmación
        await enviarCorreo(result.usuario, {
            ...result.reserva,
            sala_nombre: result.sala ? result.sala.nombre : 'Sala Desconocida'
        }, 'confirmacion');
        
        res.status(200).json({ message: 'Reserva confirmada exitosamente' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerDisponibilidad = async (req, res) => {
    try {
        const salaId = req.params.salaId;
        const yearMonth = req.params.yearMonth;
        const disponibilidad = await reservaService.obtenerDisponibilidad(salaId, yearMonth);
        res.status(200).json(disponibilidad);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerDisponibilidadHoraria = async (req, res) => {
    try {
        const salaId = req.params.salaId;
        const fecha = req.params.fecha;
        const horarios = await reservaService.obtenerDisponibilidadHoraria(salaId, fecha);
        res.status(200).json(horarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ========== Métodos para administración ==========
const obtenerTodasSalas = async (req, res) => {
    try {
        const salas = await reservaService.obtenerSalas();
        res.status(200).json(salas || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearSala = async (req, res) => {
    try {
        const salaData = req.body;
        const nuevaSala = await reservaService.crearSala(salaData);
        res.status(201).json(nuevaSala);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const actualizarSala = async (req, res) => {
    try {
        const salaId = req.params.id;
        const salaData = req.body;
        const salaActualizada = await reservaService.actualizarSala(salaId, salaData);
        res.status(200).json(salaActualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const eliminarSala = async (req, res) => {
    try {
        const salaId = req.params.id;
        const result = await reservaService.eliminarSala(salaId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerTodosUsuarios = async (req, res) => {
    try {
        const usuarios = await authService.obtenerTodosUsuarios();
        res.status(200).json(usuarios || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearUsuario = async (req, res) => {
    try {
        const { nombre, email, password, role, status } = req.body;
        
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
        }
        
        const user = await authService.registerUser(nombre, email, password);
        
        if (role || status) {
            const updateData = {};
            if (role) updateData.role = role;
            if (status) updateData.status = status;
            
            await authService.actualizarUsuario(user.uid, updateData);
        }
        
        res.status(201).json({
            uid: user.uid,
            nombre: user.nombre,
            email: user.email,
            role: role || 'Usuario',
            status: status || 'active'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const usuarioData = req.body;
        
        if (usuarioData.uid) {
            delete usuarioData.uid;
        }
        
        const usuarioActualizado = await authService.actualizarUsuario(usuarioId, usuarioData);
        res.status(200).json(usuarioActualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const result = await authService.eliminarUsuario(usuarioId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerTodasReservas = async (req, res) => {
    try {
        const reservas = await reservaService.obtenerTodasReservas();
        res.status(200).json(reservas || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarReserva = async (req, res) => {
    try {
        const reservaId = req.params.id;
        const result = await reservaService.eliminarReserva(reservaId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerSalaAdmin = async (req, res) => {
    try {
        const salaId = req.params.id;
        const sala = await reservaService.obtenerSala(salaId);
        if (!sala) {
            return res.status(404).json({ error: 'Sala no encontrada' });
        }
        res.status(200).json(sala);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerUsuarioAdmin = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const usuario = await authService.obtenerUsuario(usuarioId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== MIDDLEWARES ====================
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Acceso no autorizado' });
        }
        
        const decodedToken = await auth.verifyIdToken(token);
        
        // Usar servicio para obtener datos del usuario
        const userData = await authService.obtenerUsuario(decodedToken.uid);
        
        if (!userData) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            nombre: userData.nombre,
            role: userData.role,
            status: userData.status
        };
        
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        let errorMessage = 'Token inválido';
        if (error.code === 'auth/id-token-expired') errorMessage = 'Token expirado';
        res.status(401).json({ error: errorMessage });
    }
};

const adminAuth = (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'No autenticado' });
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }
        next();
    } catch (error) {
        console.error('Error en adminAuth:', error);
        res.status(500).json({ error: 'Error de autenticación' });
    }
};

module.exports = {
    register,
    login,
    crearReserva,
    obtenerReservasUsuario,
    obtenerSalas,
    obtenerSala,
    cancelarReserva,
    confirmarReserva,
    obtenerDisponibilidad,
    obtenerDisponibilidadHoraria,
    obtenerTodasSalas,
    crearSala,
    actualizarSala,
    eliminarSala,
    obtenerTodosUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    obtenerTodasReservas,
    eliminarReserva,
    obtenerSalaAdmin,
    obtenerUsuarioAdmin,
    authenticate,
    adminAuth
};