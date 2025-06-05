const app = require('./app');

// Iniciar el servidor
const port = app.get('port');
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});