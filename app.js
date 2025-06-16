require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Importación de rutas
const usuarioRoutes = require('./routes/usuarioRoutes');
const salaRoutes = require('./routes/salaRoutes');
const reservaRoutes = require('./routes/reservaRoutes');

// Configuración de Express
const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de rutas API
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/reservas', reservaRoutes);

// Ruta principal - servir el index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: err.message 
  });
});

// Ruta para 404 (debe ir al final)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en modo ${ENV} en el puerto ${PORT}`);
  console.log(`Accede a la aplicación en http://localhost:${PORT}`);
});

module.exports = app;