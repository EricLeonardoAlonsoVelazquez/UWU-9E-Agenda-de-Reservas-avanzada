const express = require('express');
const router = express.Router();
const salaController = require('../controllers/salaController');


router.get('/', salaController.getAllSalas);
router.post('/', salaController.createSala);
router.get('/:id', salaController.getSalaById);
router.put('/:id', salaController.updateSala);
router.delete('/:id', salaController.deleteSala);

module.exports = router;