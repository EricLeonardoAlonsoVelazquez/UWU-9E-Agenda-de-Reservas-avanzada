require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const routes = require('./routes/Routes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`Servidor corriendo en modo ${ENV} en el puerto ${PORT}`);
  console.log(`Accede a la aplicación en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log(`- Usuarios: http://localhost:${PORT}/api/usuarios`);
  console.log(`- Salas: http://localhost:${PORT}/api/salas`);
  console.log(`- Reservas: http://localhost:${PORT}/api/reservas`);
});

module.exports = app;