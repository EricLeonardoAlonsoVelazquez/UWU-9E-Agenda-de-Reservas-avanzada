const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Configuración para Firebase Admin (servidor)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com/"
});

// Configuración para Firebase Client (autenticación)
const firebaseConfig = {
  apiKey: "AIzaSyAY5bLiuzOKkVAlYJm4QKB6EJT7-8_IPOY",
  authDomain: "uwu-9e.firebaseapp.com",
  databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com",
  projectId: "uwu-9e",
  storageBucket: "uwu-9e.firebasestorage.app",
  messagingSenderId: "947472942401",
  appId: "1:947472942401:web:585157650473b1a6748dc0"
};
// Inicializar apps
const firebaseApp = initializeApp(firebaseConfig);
const authClient = getAuth(firebaseApp);

// Referencias
const db = admin.database();
const auth = admin.auth();

module.exports = {
  db,
  auth,
  authClient,
  signInWithEmailAndPassword: require('firebase/auth').signInWithEmailAndPassword
};