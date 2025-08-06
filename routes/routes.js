const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller');
const { authenticate, adminAuth } = controller; // Importar desde controller

// Autenticación
router.post('/register', controller.register);
router.post('/login', controller.login);

// Middleware de autenticación aplicado a rutas
router.use(authenticate); // Todas las rutas debajo requieren autenticación

// Salas
router.get('/salas', controller.obtenerSalas);
router.get('/salas/:id', controller.obtenerSala);

// Reservas
router.post('/reservar', controller.crearReserva);
router.get('/reservas', controller.obtenerReservasUsuario);
router.post('/reservas/:id/confirmar', controller.confirmarReserva);
router.delete('/reservas/:id/cancelar', controller.cancelarReserva);

// Disponibilidad
router.get('/disponibilidad-mensual/:salaId/:yearMonth', controller.obtenerDisponibilidad);
router.get('/disponibilidad-horaria/:salaId/:fecha', controller.obtenerDisponibilidadHoraria);

// ===== RUTAS DE ADMINISTRACIÓN =====
router.use(adminAuth); // Todas las rutas debajo requieren ser admin

// Gestión de salas
router.get('/admin/salas', controller.obtenerTodasSalas);
router.get('/admin/salas/:id', controller.obtenerSalaAdmin);
router.post('/admin/salas', controller.crearSala);
router.put('/admin/salas/:id', controller.actualizarSala);
router.delete('/admin/salas/:id', controller.eliminarSala);

// Gestión de usuarios
router.get('/admin/usuarios', controller.obtenerTodosUsuarios);
router.get('/admin/usuarios/:id', controller.obtenerUsuarioAdmin);
router.post('/admin/usuarios', controller.crearUsuario);
router.put('/admin/usuarios/:id', controller.actualizarUsuario);
router.delete('/admin/usuarios/:id', controller.eliminarUsuario);

// Gestión de reservas
router.get('/admin/reservas', controller.obtenerTodasReservas);
router.delete('/admin/reservas/:id', controller.eliminarReserva);

// Manejar rutas no encontradas
router.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejador de errores
router.use((err, req, res, next) => {
    console.error('Error interno:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = router;