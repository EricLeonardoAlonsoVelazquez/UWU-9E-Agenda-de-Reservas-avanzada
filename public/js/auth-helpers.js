import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { app } from "./login.js";

const auth = getAuth(app);

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    onAuthStateChanged(auth, (user) => {
        // Si estamos en login.html y el usuario está autenticado, redirigir
        if (user && currentPage === 'login.html') {
            window.location.href = 'index.html';
        }
        // Si estamos en index.html y no hay usuario, redirigir a login
        else if (!user && currentPage !== 'login.html') {
            window.location.href = 'login.html';
        }
    });
});