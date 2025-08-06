document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');

    loginForm.addEventListener('input', (e) => {
        if (e.target.matches('#email, #password')) {
            validateField(e.target);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        toggleLoadingState(true);
        
        try {
            const response = await sendLoginData();
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Error en el inicio de sesión');
            }
            
            // Guardar token y datos de usuario
            localStorage.setItem('firebaseToken', responseData.token);
            localStorage.setItem('userName', responseData.nombre);
            localStorage.setItem('userEmail', responseData.email);
            localStorage.setItem('userId', responseData.uid);
            localStorage.setItem('userRole', responseData.role); // Guardar rol
            
            showSuccessAndRedirect();
            
        } catch (error) {
            handleLoginError(error);
        } finally {
            toggleLoadingState(false);
        }
    });
    
    // ============ FUNCIONES AUXILIARES ============
    
    function validateField(field) {
        if (field.id === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            field.setCustomValidity(emailRegex.test(field.value) ? '' : 'Email inválido');
        }
        
        if (field.id === 'password') {
            field.setCustomValidity(field.value.length >= 1 ? '' : 'Contraseña requerida');
        }
        
        field.classList.toggle('is-invalid', !field.validity.valid);
    }
    
    function validateForm() {
        let isValid = true;
        ['email', 'password'].forEach(id => {
            const field = document.getElementById(id);
            validateField(field);
            if (!field.validity.valid) isValid = false;
        });
        return isValid;
    }
    
    function toggleLoadingState(isLoading) {
        loginText.textContent = isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión';
        loginSpinner.classList.toggle('d-none', !isLoading);
        loginBtn.disabled = isLoading;
    }
    
    async function sendLoginData() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        return await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
    }
    
    function showSuccessAndRedirect() {
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        
        // Obtener el rol del usuario
        const userRole = localStorage.getItem('userRole');
        
        // Redirigir según el rol
        setTimeout(() => {
            if (userRole === 'admin') {
                window.location.href = 'admin-dashboard.html'; // Página de admin
            } else {
                window.location.href = 'index.html'; // Página de usuario normal
            }
        }, 2000);
    }
    
    function handleLoginError(error) {
        console.error('Error en inicio de sesión:', error);
        showMessage(error.message, 'danger');
    }
    
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `alert alert-${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
});