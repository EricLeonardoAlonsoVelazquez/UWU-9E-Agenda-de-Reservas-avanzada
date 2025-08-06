require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Registrar rutas
app.use('/api', routes);

// Ruta comodín para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.message);
    res.status(err.statusCode || 500).json({ 
        error: err.message || 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('• Endpoint registro: POST http://localhost:3000/api/register');
    console.log('• Endpoint login: POST http://localhost:3000/api/login');
    console.log('• Endpoint salas: GET http://localhost:3000/api/salas');
    console.log('• Vista de la aplicación: http://localhost:3000');
});