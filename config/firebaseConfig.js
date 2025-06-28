const admin = require("firebase-admin");

// Inicialización segura (evita duplicados)
if (!admin.apps.length) {
  const serviceAccount = require("./serviceAccountKey.json");
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com/"
  });
}

// Exporta los servicios
module.exports = {
  db: admin.database(),
  auth: admin.auth(),
  admin // Opcional: por si necesitas el admin directamente
};