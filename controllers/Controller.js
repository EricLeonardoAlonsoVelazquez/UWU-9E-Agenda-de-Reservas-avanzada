const { ReservaService } = require('../services/Service');
const { SalaService } = require('../services/Service');
const { UsuarioService } = require('../services/Service');

const getAllReservas = async (req, res) => {
    try {
        const reservas = await ReservaService.getAllReservas();
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
        const reserva = await ReservaService.getReservaById(req.params.id);
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
        console.log('Body recibido:', req.body);
        
        if (!req.body) {
            return res.status(400).json({ 
                error: 'Cuerpo de la solicitud vacío',
                detalles: 'Se esperaba un objeto JSON con los datos de la reserva'
            });
        }

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

        const nuevaReserva = await ReservaService.createReserva(req.body);
        
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
            detalles: error.stack
        });
    }
};

const updateReserva = async (req, res) => {
    try {
        const reservaActualizada = await ReservaService.updateReserva(req.params.id, req.body);
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
        await ReservaService.deleteReserva(req.params.id);
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

        const disponible = await ReservaService.checkDisponibilidad(salaId, fecha, horaInicio, horaFin);
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

        const reservas = await ReservaService.getReservasBySalaAndDate(salaId, fecha);
        res.json(reservas);
    } catch (error) {
        res.status(400).json({ 
            error: 'Error al obtener reservas',
            message: error.message 
        });
    }
};

// Controladores para Salas
const getAllSalas = async (req, res) => {
  try {
    const salas = await SalaService.getAllSalas();
    res.json(salas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalaById = async (req, res) => {
  try {
    const sala = await SalaService.getSalaById(req.params.id);
    if (!sala) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    res.json(sala);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createSala = async (req, res) => {
  try {
    const nuevaSala = await SalaService.createSala(req.body);
    res.status(201).json(nuevaSala);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateSala = async (req, res) => {
  try {
    const salaActualizada = await SalaService.updateSala(req.params.id, req.body);
    res.json(salaActualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteSala = async (req, res) => {
  try {
    await SalaService.deleteSala(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controladores para Usuarios
const getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.getAllUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsuarioById = async (req, res) => {
  try {
    const usuario = await UsuarioService.getUsuarioById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUsuario = async (req, res) => {
  try {
    const nuevoUsuario = await UsuarioService.createUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const usuarioActualizado = await UsuarioService.updateUsuario(req.params.id, req.body);
    res.json(usuarioActualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUsuario = async (req, res) => {
  try {
    await UsuarioService.deleteUsuario(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
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
};