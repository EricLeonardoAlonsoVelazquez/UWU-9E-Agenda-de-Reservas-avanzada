const reservaService = require('../services/reservaService');

const getAllReservas = async (req, res) => {
    try {
        const reservas = await reservaService.getAllReservas();
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al obtener reservas',
            message: error.message 
        });
    }
};

const getReservaById = async (req, res) => {
    try {
        const reserva = await reservaService.getReservaById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        res.json(reserva);
    } catch (error) {
        res.status(500).json({ 
            error: 'Error al obtener reserva',
            message: error.message 
        });
    }
};

const createReserva = async (req, res) => {
    try {
        console.log('Body recibido:', req.body); // Para depuración
        
        // Validar que el body existe
        if (!req.body) {
            return res.status(400).json({ 
                error: 'Cuerpo de la solicitud vacío',
                detalles: 'Se esperaba un objeto JSON con los datos de la reserva'
            });
        }

        // Validar campos mínimos
        const requiredFields = ['usuario_id', 'sala_id', 'fecha', 'hora_inicio', 'hora_fin'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos requeridos faltantes',
                campos_faltantes: missingFields,
                ejemplo_correcto: {
                    usuario_id: "ID_DEL_USUARIO",
                    sala_id: "ID_DE_LA_SALA",
                    fecha: "2023-12-31",
                    hora_inicio: "14:00",
                    hora_fin: "15:00"
                }
            });
        }

        const nuevaReserva = await reservaService.createReserva(req.body);
        
        res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: nuevaReserva
        });
    } catch (error) {
        console.error('Error en createReserva controller:', error);
        res.status(400).json({
            error: 'Error al crear reserva',
            message: error.message,
            detalles: error.stack // Solo para desarrollo, quitar en producción
        });
    }
};

const updateReserva = async (req, res) => {
    try {
        const reservaActualizada = await reservaService.updateReserva(req.params.id, req.body);
        res.json(reservaActualizada);
    } catch (error) {
        res.status(400).json({ 
            error: 'Error al actualizar reserva',
            message: error.message 
        });
    }
};

const deleteReserva = async (req, res) => {
    try {
        await reservaService.deleteReserva(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ 
            error: 'Error al eliminar reserva',
            message: error.message 
        });
    }
};

const checkDisponibilidad = async (req, res) => {
    try {
        const { salaId, fecha, horaInicio, horaFin } = req.query;
        
        if (!salaId || !fecha || !horaInicio || !horaFin) {
            return res.status(400).json({ error: 'Todos los parámetros son requeridos' });
        }

        const disponible = await reservaService.checkDisponibilidad(salaId, fecha, horaInicio, horaFin);
        res.json({ disponible });
    } catch (error) {
        res.status(400).json({ 
            error: 'Error al verificar disponibilidad',
            message: error.message 
        });
    }
};

const getReservasBySalaAndDate = async (req, res) => {
    try {
        const { salaId, fecha } = req.query;
        
        if (!salaId || !fecha) {
            return res.status(400).json({ error: 'salaId y fecha son requeridos' });
        }

        const reservas = await reservaService.getReservasBySalaAndDate(salaId, fecha);
        res.json(reservas);
    } catch (error) {
        res.status(400).json({ 
            error: 'Error al obtener reservas',
            message: error.message 
        });
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