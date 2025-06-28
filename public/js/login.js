import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyAY5bLiuzOKkVAlYJm4QKB6EJT7-8_IPOY",
  authDomain: "uwu-9e.firebaseapp.com",
  databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com",
  projectId: "uwu-9e",
  storageBucket: "uwu-9e.firebasestorage.app",
  messagingSenderId: "947472942401",
  appId: "1:947472942401:web:585157650473b1a6748dc0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Variable para controlar redirecciones
let isAuthenticating = false;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Verificar estado de autenticación
  checkAuthState();

  loginForm.addEventListener("submit", handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  isAuthenticating = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const submitBtn = document.querySelector("#loginForm button[type='submit']");
  const messageDiv = document.getElementById("loginMessage");

  if (!email || !password) {
    showMessage("Por favor completa todos los campos", "error", messageDiv);
    isAuthenticating = false;
    return;
  }

  try {
    toggleLoadingState(submitBtn, true);
    
    await setPersistence(auth, browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Obtener datos adicionales del usuario
    const userData = await getUserData(userCredential.user.uid);
    
    // Guardar en sessionStorage (no localStorage)
    sessionStorage.setItem('firebaseUser', JSON.stringify({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      name: userData?.nombre || userCredential.user.email.split('@')[0],
      role: userData?.rol || 'usuario'
    }));

    // Redirigir sin mensaje para evitar problemas
    window.location.href = 'index.html';
    
  } catch (error) {
    handleLoginError(error, messageDiv);
    isAuthenticating = false;
  } finally {
    toggleLoadingState(submitBtn, false);
  }
}

function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (isAuthenticating) return;
    
    const currentPage = window.location.pathname.split('/').pop();
    
    // Si hay usuario y estamos en login, redirigir
    if (user && currentPage === 'login.html') {
      window.location.href = 'index.html';
    }
  });
}

// Obtener datos del usuario desde Firebase Database
async function getUserData(uid) {
  try {
    const snapshot = await get(ref(database, `usuarios/${uid}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error al obtener datos:", error);
    return null;
  }
}

// Redirigir según el rol
function redirectUser(role) {
  const targetPage = role === 'admin' ? 'admin.html' : 'index.html';
  // Forzar recarga para evitar caché
  window.location.href = targetPage + '?t=' + Date.now();
}

// Mostrar mensajes de error
function handleLoginError(error, messageDiv) {
  const errorMessages = {
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/user-disabled': 'Cuenta deshabilitada',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/too-many-requests': 'Demasiados intentos. Intente más tarde',
    'default': 'Error al iniciar sesión. Intente nuevamente.'
  };

  const message = errorMessages[error.code] || errorMessages.default;
  showMessage(message, "error", messageDiv);
}

// Cambiar estado del botón de login
function toggleLoadingState(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.innerHTML = isLoading
    ? '<span class="spinner-border spinner-border-sm"></span> Procesando...'
    : 'Iniciar sesión';
}

// Mostrar mensajes en la UI
function showMessage(message, type, container) {
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}