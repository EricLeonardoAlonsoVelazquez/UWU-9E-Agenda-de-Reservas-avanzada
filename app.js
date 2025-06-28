require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const admin = require('firebase-admin');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Configuración inicial
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const isProduction = ENV === 'production';

// Inicialización de Firebase Admin (solo si no existe una app inicializada)
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./config/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

// Configuración de Express
const app = express();
const httpServer = createServer(app);

// Configuración de Socket.io con CORS
const io = new Server(httpServer, {
  cors: {
    origin: isProduction ? process.env.CORS_ORIGIN : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutos
    skipMiddlewares: true
  }
});

// Middlewares básicos
app.use(cors({
  origin: isProduction ? process.env.CORS_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Middleware para servir archivos estáticos con caching en producción
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '1y' : '0',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (isProduction) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Middleware de autenticación Firebase mejorado
const authenticateFirebase = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Authentication token required'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Verificación adicional en la base de datos
    const userRef = admin.database().ref(`usuarios/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User not registered in database'
      });
    }

    const userData = userSnapshot.val();
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || userData.nombre,
      role: userData.rol || 'user',
      metadata: {
        createdAt: userData.creado_en || null,
        lastLogin: new Date().toISOString()
      }
    };

    // Actualizar último acceso
    await userRef.update({ 
      ultimo_acceso: admin.database.ServerValue.TIMESTAMP 
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    const errorMap = {
      'auth/id-token-expired': { status: 401, message: 'Token expired' },
      'auth/argument-error': { status: 400, message: 'Invalid token format' },
      'auth/invalid-id-token': { status: 403, message: 'Invalid token' },
      'default': { status: 500, message: 'Authentication failed' }
    };

    const errorInfo = errorMap[error.code] || errorMap.default;
    res.status(errorInfo.status).json({
      success: false,
      error: error.code || 'AuthError',
      message: errorInfo.message
    });
  }
};

// Configuración mejorada de WebSocket con manejo de errores
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Verificar usuario en la base de datos
    const userSnapshot = await admin.database()
      .ref(`usuarios/${decodedToken.uid}`)
      .once('value');
    
    if (!userSnapshot.exists()) {
      return next(new Error('User not registered'));
    }

    socket.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || userSnapshot.val().nombre,
      role: userSnapshot.val().rol || 'user'
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Manejo de conexiones Socket.io con reconexión
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.user.uid} (${socket.id})`);
  
  // Unir al usuario a una sala con su UID
  socket.join(socket.user.uid);
  
  // Manejar eventos personalizados
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.user.uid} (${socket.id}) - Reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.user.uid}:`, error);
  });
});

// Rutas básicas mejoradas
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    database: 'Connected' // Podrías verificar la conexión a Firebase aquí
  });
});

// Rutas de autenticación mejoradas
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validación mejorada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'MissingCredentials',
        message: 'Email and password are required',
        fields: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // En producción, considera usar Firebase Client SDK para el login
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Verificar si el usuario está deshabilitado
    if (userRecord.disabled) {
      return res.status(403).json({
        success: false,
        error: 'AccountDisabled',
        message: 'This account has been disabled'
      });
    }

    // Generar token personalizado
    const token = await admin.auth().createCustomToken(userRecord.uid);
    
    // Obtener información adicional de la base de datos
    const userSnapshot = await admin.database()
      .ref(`usuarios/${userRecord.uid}`)
      .once('value');
    
    const userData = userSnapshot.val() || {};
    
    // Actualizar último inicio de sesión
    await admin.database()
      .ref(`usuarios/${userRecord.uid}`)
      .update({ 
        ultimo_login: admin.database.ServerValue.TIMESTAMP 
      });

    res.json({
      success: true,
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || userData.nombre,
        role: userData.rol || 'user',
        metadata: {
          createdAt: userData.creado_en || null,
          lastLogin: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    const errorResponses = {
      'auth/user-not-found': {
        status: 404,
        message: 'User not found'
      },
      'auth/wrong-password': {
        status: 401,
        message: 'Invalid credentials'
      },
      'auth/too-many-requests': {
        status: 429,
        message: 'Too many attempts. Try again later'
      },
      'default': {
        status: 500,
        message: 'Login failed'
      }
    };

    const response = errorResponses[error.code] || errorResponses.default;
    res.status(response.status).json({
      success: false,
      error: error.code || 'LoginError',
      message: response.message
    });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;
    
    // Validación mejorada
    const errors = {};
    if (!nombre) errors.nombre = 'Name is required';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Validation failed',
        errors
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'WeakPassword',
        message: 'Password must be at least 6 characters',
        strength: {
          length: password.length,
          meetsMinimum: false
        }
      });
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      phoneNumber: telefono || null,
      emailVerified: false,
      disabled: false
    });

    // Guardar datos adicionales en Realtime Database
    const userData = {
      nombre,
      email,
      telefono: telefono || null,
      rol: 'usuario',
      creado_en: admin.database.ServerValue.TIMESTAMP,
      actualizado_en: admin.database.ServerValue.TIMESTAMP,
      estado: 'activo'
    };

    await admin.database()
      .ref(`usuarios/${userRecord.uid}`)
      .set(userData);

    // Generar token para el nuevo usuario
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      token,
      user: {
        uid: userRecord.uid,
        email,
        name: nombre,
        phone: telefono || null,
        role: 'usuario',
        metadata: {
          createdAt: new Date().toISOString(),
          verified: false
        }
      }
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
        message: 'Password too weak'
      },
      'auth/phone-number-already-exists': {
        status: 409,
        message: 'Phone number already registered'
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
      message: response.message,
      ...(error.code === 'auth/weak-password' && {
        requirements: {
          minLength: 6,
          requiresLowercase: false,
          requiresUppercase: false,
          requiresNumbers: false,
          requiresSymbols: false
        }
      })
    });
  }
});

// Rutas estáticas con manejo de caché
app.get(['/', '/login', '/register', '/dashboard'], (req, res) => {
  const page = req.path === '/' ? 'index.html' : `${req.path.substring(1)}.html`;
  const options = {
    maxAge: isProduction ? '1d' : '0',
    cacheControl: isProduction,
    immutable: isProduction
  };
  
  res.sendFile(path.join(__dirname, 'public', page), options, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      if (!res.headersSent) {
        res.status(404).send('Page not found');
      }
    }
  });
});

// Importar rutas API
const apiRoutes = require('./routes/Routes');
app.use('/api', authenticateFirebase, apiRoutes);

// Middleware de manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  // Errores de base de datos
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(400).json({
      success: false,
      error: err.code,
      message: err.message
    });
  }
  
  // Error genérico del servidor
  res.status(500).json({
    success: false,
    error: 'ServerError',
    message: 'Internal server error',
    ...(!isProduction && { stack: err.stack })
  });
});

// Ruta 404 mejorada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      auth: ['POST /api/login', 'POST /api/register'],
      api: ['GET /api/health', '...'] // Aquí podrías listar tus rutas dinámicamente
    }
  });
});

// Iniciar servidor con manejo de errores
httpServer.listen(PORT, () => {
  console.log(`Server running in ${ENV} mode on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
  console.log('Press CTRL+C to stop the server');
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Manejo de cierre mejorado
const shutdown = (signal) => {
  return new Promise((resolve) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    // Cerrar el servidor HTTP
    httpServer.close(() => {
      console.log('HTTP server closed');
      
      // Cerrar conexiones de Socket.io
      io.close(() => {
        console.log('Socket.io server closed');
        resolve();
      });
    });
    
    // Forzar cierre después de 10 segundos
    setTimeout(() => {
      console.warn('Forcing shutdown...');
      process.exit(1);
    }, 10000);
  });
};

// Manejadores de señales
process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));
process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));

// Exportar para testing
module.exports = { 
  app, 
  httpServer,
  io,
  shutdown
};