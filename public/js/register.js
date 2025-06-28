import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// Configuración de Firebase (con tus datos reales)
const firebaseConfig = {
  apiKey: "AIzaSyAY5bLiuzOKkVAlYJm4QKB6EJT7-8_IPOY",
  authDomain: "uwu-9e.firebaseapp.com",
  databaseURL: "https://uwu-9e-default-rtdb.firebaseio.com",
  projectId: "uwu-9e",
  storageBucket: "uwu-9e.firebasestorage.app",
  messagingSenderId: "947472942401",
  appId: "1:947472942401:web:585157650473b1a6748dc0"
};

// Inicialización de Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById("register-form");
  
  if (!registerForm) {
    console.error("No se encontró el formulario de registro");
    return;
  }

  registerForm.addEventListener("submit", handleRegister);
});

// Manejador del evento de registro
async function handleRegister(e) {
  e.preventDefault();
  
  const nombre = document.getElementById("nombre")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const telefono = document.getElementById("telefono")?.value.trim() || null;
  const submitBtn = document.querySelector("button[type='submit']");
  const messageDiv = document.getElementById("message");

  // Validaciones de campos
  if (!validateInputs(nombre, email, password, messageDiv)) {
    return;
  }

  try {
    toggleLoadingState(submitBtn, true);
    
    // Paso 1: Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Paso 2: Guardar datos adicionales en Realtime Database
    await saveUserData(userCredential.user.uid, nombre, email, telefono);
    
    // Paso 3: Guardar datos en localStorage
    saveToLocalStorage(userCredential.user.uid, nombre, email);
    
    // Éxito: Mostrar mensaje y redirigir
    showMessage("¡Registro exitoso! Redirigiendo...", "success", messageDiv);
    setTimeout(() => window.location.href = "index.html", 2000);
    
  } catch (error) {
    handleRegistrationError(error, messageDiv);
  } finally {
    toggleLoadingState(submitBtn, false);
  }
}

// Función para validar los inputs del formulario
function validateInputs(nombre, email, password, messageDiv) {
  if (!nombre || !email || !password) {
    showMessage("Todos los campos son obligatorios", "error", messageDiv);
    return false;
  }

  if (password.length < 6) {
    showMessage("La contraseña debe tener al menos 6 caracteres", "error", messageDiv);
    return false;
  }

  if (!validateEmail(email)) {
    showMessage("Por favor ingresa un email válido", "error", messageDiv);
    return false;
  }

  return true;
}

// Función para guardar datos del usuario en Realtime Database
async function saveUserData(uid, nombre, email, telefono) {
  try {
    await set(ref(database, `usuarios/${uid}`), {
      nombre,
      email,
      telefono,
      rol: 'usuario',
      fechaRegistro: serverTimestamp(),
      ultimoAcceso: serverTimestamp()
    });
    console.log("Datos guardados en Firebase Database correctamente");
  } catch (error) {
    console.error("Error al guardar en Database:", error);
    throw new Error("No se pudieron guardar los datos adicionales");
  }
}

// Función para guardar datos en localStorage
function saveToLocalStorage(uid, nombre, email) {
  try {
    localStorage.setItem('user', JSON.stringify({
      uid,
      nombre,
      email,
      lastLogin: new Date().toISOString()
    }));
    console.log("Datos guardados en localStorage correctamente");
  } catch (error) {
    console.error("Error al guardar en localStorage:", error);
  }
}

// Función para manejar errores de registro
function handleRegistrationError(error, messageDiv) {
  console.error("Error en registro:", error);
  
  const errorMessages = {
    'auth/email-already-in-use': 'El correo electrónico ya está registrado',
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/operation-not-allowed': 'Este método de autenticación no está habilitado',
    'auth/too-many-requests': 'Demasiados intentos. Por favor intente más tarde',
    'default': 'Error al registrarse. Por favor intente nuevamente'
  };

  const errorMessage = errorMessages[error.code] || errorMessages.default;
  showMessage(errorMessage, "error", messageDiv);
}

// Función para cambiar el estado del botón durante carga
function toggleLoadingState(button, isLoading) {
  if (!button) return;
  
  button.disabled = isLoading;
  button.innerHTML = isLoading 
    ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...' 
    : 'Registrarse';
}

// Función para mostrar mensajes al usuario
function showMessage(message, type, messageDiv) {
  if (!messageDiv) return;
  
  // Limpiar mensajes anteriores
  messageDiv.innerHTML = '';
  
  // Crear nuevo mensaje
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  messageDiv.appendChild(alertDiv);
  
  // Mostrar la alerta
  setTimeout(() => alertDiv.classList.add('show'), 10);
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => messageDiv.removeChild(alertDiv), 500);
  }, 5000);
}

// Función para validar formato de email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Función para limpiar el formulario después del registro
function clearForm() {
  document.getElementById("register-form")?.reset();
}