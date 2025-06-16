const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Ruta al archivo de credenciales (usa path para compatibilidad entre OS)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.firestore();

module.exports = db;