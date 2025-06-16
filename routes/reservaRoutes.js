const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');

// CRUD básico de reservas
router.get('/', reservaController.getAllReservas);
router.post('/', reservaController.createReserva);
router.get('/:id', reservaController.getReservaById);
router.put('/:id', reservaController.updateReserva);
router.delete('/:id', reservaController.deleteReserva);

// Endpoints especializados
router.get('/check-disponibilidad', reservaController.checkDisponibilidad);
router.get('/by-sala-date', reservaController.getReservasBySalaAndDate);

module.exports = router;