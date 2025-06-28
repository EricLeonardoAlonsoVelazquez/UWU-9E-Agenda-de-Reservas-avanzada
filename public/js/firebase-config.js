// Configuración centralizada de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAY5bLiuzOKkVAlYJm4QKB6EJT7-8_IPOY",
  authDomain: "uwu-9e.firebaseapp.com",
  databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com",
  projectId: "uwu-9e",
  storageBucket: "uwu-9e.appspot.com",
  messagingSenderId: "947472942401",
  appId: "1:947472942401:web:585157650473b1a6748dc0"
};

// Exportación para módulos
export const initFirebase = () => {
  return initializeApp(firebaseConfig);
};