const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = require('../config/firebaseConfig');

// Importar controladores
const Controller = require('../controllers/Controller');

// Middleware de autenticación mejorado
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Unauthorized',
                message: 'Authentication token is required'
            });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        const userSnapshot = await db.ref(`usuarios/${decodedToken.uid}`).once('value');
        
        if (!userSnapshot.exists()) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'User not registered in the system'
            });
        }
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email.split('@')[0],
            role: userSnapshot.val().rol || 'user'
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        const errorMessages = {
            'auth/id-token-expired': 'Token expired',
            'auth/argument-error': 'Malformed token',
            'default': 'Invalid token'
        };
        
        return res.status(403).json({ 
            success: false,
            error: 'Forbidden',
            message: errorMessages[error.code] || errorMessages.default
        });
    }
};

// Middleware de autorización por roles
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};

// ================== RUTAS PÚBLICAS ================== //

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del servicio
 *     responses:
 *       200:
 *         description: Servicio en funcionamiento
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Reservation System API',
        version: '1.0.0'
    });
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 */
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'MissingFields',
                message: 'Name, email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'WeakPassword',
                message: 'Password must be at least 6 characters'
            });
        }

        // Crear usuario en Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nombre
        });

        // Guardar datos en Realtime Database
        await db.ref('usuarios').child(userRecord.uid).set({
            nombre,
            correo: email,
            rol: 'usuario',
            creado_en: admin.database.ServerValue.TIMESTAMP,
            actualizado_en: admin.database.ServerValue.TIMESTAMP
        });

        // Generar token personalizado
        const token = await admin.auth().createCustomToken(userRecord.uid);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                uid: userRecord.uid,
                email,
                name: nombre,
                role: 'usuario'
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        const errorResponses = {
            'auth/email-already-exists': {
                status: 409,
                message: 'Email already registered'
            },
            'auth/invalid-email': {
                status: 400,
                message: 'Invalid email format'
            },
            'auth/weak-password': {
                status: 400,
                message: 'Password must be at least 6 characters'
            },
            'auth/too-many-requests': {
                status: 429,
                message: 'Too many requests. Try again later'
            },
            'default': {
                status: 500,
                message: 'Registration failed'
            }
        };
        
        const response = errorResponses[error.code] || errorResponses.default;
        res.status(response.status).json({
            success: false,
            error: error.code || 'RegistrationError',
            message: response.message
        });
    }
});

// ================== RUTAS PROTEGIDAS ================== //

// ------------------ Reservas ------------------ //
router.get('/reservas', authenticate, Controller.getAllReservas);
router.post('/reservas', authenticate, Controller.createReserva);
router.get('/reservas/:id', authenticate, Controller.getReservaById);
router.put('/reservas/:id', authenticate, Controller.updateReserva);
router.delete('/reservas/:id', authenticate, Controller.deleteReserva);
router.get('/reservas/check-disponibilidad', authenticate, Controller.checkDisponibilidad);
router.get('/reservas/by-sala-date', authenticate, Controller.getReservasBySalaAndDate);

// ------------------ Salas ------------------ //
router.get('/salas', authenticate, Controller.getAllSalas);
router.post('/salas', authenticate, authorize(['admin']), Controller.createSala);
router.get('/salas/:id', authenticate, Controller.getSalaById);
router.put('/salas/:id', authenticate, authorize(['admin']), Controller.updateSala);
router.delete('/salas/:id', authenticate, authorize(['admin']), Controller.deleteSala);

// ------------------ Usuarios ------------------ //
router.get('/usuarios', authenticate, authorize(['admin']), Controller.getAllUsuarios);
router.post('/usuarios', authenticate, authorize(['admin']), Controller.createUsuario);
router.get('/usuarios/:id', authenticate, Controller.getUsuarioById);
router.put('/usuarios/:id', authenticate, Controller.updateUsuario);
router.delete('/usuarios/:id', authenticate, authorize(['admin']), Controller.deleteUsuario);

// ------------------ Perfil ------------------ //
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userSnapshot = await db.ref(`usuarios/${req.user.uid}`).once('value');
        
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                error: 'UserNotFound',
                message: 'User data not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...req.user,
                ...userSnapshot.val()
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            error: 'ServerError',
            message: 'Failed to retrieve profile'
        });
    }
});

// ================== MANEJO DE ERRORES ================== //

// Ruta no encontrada
router.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Endpoint not found'
    });
});

// Manejo de errores
router.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'ServerError',
        message: 'Internal server error'
    });
});

module.exports = router;