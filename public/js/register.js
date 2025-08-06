document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');
    const registerBtn = document.getElementById('registerBtn');
    const registerText = document.getElementById('registerText');
    const registerSpinner = document.getElementById('registerSpinner');

    // Validación en tiempo real
    registerForm.addEventListener('input', (e) => {
        if (e.target.matches('#email, #password, #nombre')) {
            validateField(e.target);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        toggleLoadingState(true);
        
        try {
            const response = await sendRegistrationData();
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Error en el registro');
            }
            
            showSuccessAndRedirect();
            
        } catch (error) {
            handleRegistrationError(error);
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
            field.setCustomValidity(field.value.length >= 6 ? '' : 'Mínimo 6 caracteres');
        }
        
        if (field.id === 'nombre') {
            field.setCustomValidity(field.value.trim() !== '' ? '' : 'Nombre requerido');
        }
        
        field.classList.toggle('is-invalid', !field.validity.valid);
    }
    
    function validateForm() {
        let isValid = true;
        ['nombre', 'email', 'password'].forEach(id => {
            const field = document.getElementById(id);
            validateField(field);
            if (!field.validity.valid) isValid = false;
        });
        return isValid;
    }
    
    function toggleLoadingState(isLoading) {
        registerText.textContent = isLoading ? 'Registrando...' : 'Registrarse';
        registerSpinner.classList.toggle('d-none', !isLoading);
        registerBtn.disabled = isLoading;
    }
    
    async function sendRegistrationData() {
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        return await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });
    }
    
    function showSuccessAndRedirect() {
        showMessage('¡Registro exitoso! Redirigiendo...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
    
    function handleRegistrationError(error) {
        console.error('Error en registro:', error);
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