const express = require('express');
const router = express.Router();

const {
    // Reservas
    getAllReservas,
    getReservaById,
    createReserva,
    updateReserva,
    deleteReserva,
    checkDisponibilidad,
    getReservasBySalaAndDate,
    
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
    deleteUsuario
} = require('../controllers/Controller');

// Rutas para Reservas
router.get('/reservas', getAllReservas);
router.post('/reservas', createReserva);
router.get('/reservas/:id', getReservaById);
router.put('/reservas/:id', updateReserva);
router.delete('/reservas/:id', deleteReserva);

// Endpoints especializados para Reservas
router.get('/reservas/check-disponibilidad', checkDisponibilidad);
router.get('/reservas/by-sala-date', getReservasBySalaAndDate);

// Rutas para Salas
router.get('/salas', getAllSalas);
router.post('/salas', createSala);
router.get('/salas/:id', getSalaById);
router.put('/salas/:id', updateSala);
router.delete('/salas/:id', deleteSala);

// Rutas para Usuarios
router.get('/usuarios', getAllUsuarios);
router.post('/usuarios', createUsuario);
router.get('/usuarios/:id', getUsuarioById);
router.put('/usuarios/:id', updateUsuario);
router.delete('/usuarios/:id', deleteUsuario);

module.exports = router;