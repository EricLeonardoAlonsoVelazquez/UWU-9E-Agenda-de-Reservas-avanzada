document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = '/api';
    
    // Cargar reservas al iniciar
    cargarReservas();
    
    // Manejar creación de reservas
    document.getElementById('reservaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            // Validar campos antes de enviar
            const usuarioId = document.getElementById('usuarioId').value.trim();
            const salaId = document.getElementById('salaId').value.trim();
            const fecha = document.getElementById('fecha').value;
            const horaInicio = document.getElementById('horaInicio').value;
            const horaFin = document.getElementById('horaFin').value;

            if (!usuarioId || !salaId || !fecha || !horaInicio || !horaFin) {
                throw new Error('Todos los campos son obligatorios');
            }

            if (horaInicio >= horaFin) {
                throw new Error('La hora de inicio debe ser anterior a la hora de fin');
            }

            const reserva = {
                usuario_id: usuarioId,
                sala_id: salaId,
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin
            };
            
            console.log('Enviando reserva:', reserva); // Para depuración
            
            const response = await fetch(`${API_BASE_URL}/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reserva)
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error('Error del servidor:', responseData);
                throw new Error(responseData.error || responseData.message || 'Error al crear reserva');
            }
            
            mostrarMensaje(`Reserva creada exitosamente! ID: ${responseData.data.id}`, 'success');
            document.getElementById('reservaForm').reset();
            cargarReservas();
        } catch (error) {
            console.error('Error al crear reserva:', error);
            mostrarMensaje(`Error: ${error.message}\n\nPor favor verifica los datos e intenta nuevamente.`, 'error');
        }
    });
    
    // Manejar verificación de disponibilidad
    document.getElementById('disponibilidadForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const params = new URLSearchParams({
                salaId: document.getElementById('dispSalaId').value.trim(),
                fecha: document.getElementById('dispFecha').value,
                horaInicio: document.getElementById('dispHoraInicio').value,
                horaFin: document.getElementById('dispHoraFin').value
            });
            
            console.log('Verificando disponibilidad con:', params.toString()); // Para depuración
            
            const response = await fetch(`${API_BASE_URL}/reservas/check-disponibilidad?${params}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al verificar disponibilidad');
            }
            
            const data = await response.json();
            const resultDiv = document.getElementById('disponibilidadResult');
            resultDiv.textContent = data.disponible 
                ? '✅ La sala está disponible en ese horario' 
                : '❌ La sala NO está disponible en ese horario';
            resultDiv.className = data.disponible ? 'available' : 'not-available';
        } catch (error) {
            mostrarMensaje(error.message, 'error');
            console.error('Error al verificar disponibilidad:', error);
        }
    });

    // Validación en tiempo real para horas
    document.getElementById('horaFin').addEventListener('change', function() {
        const inicio = document.getElementById('horaInicio').value;
        const fin = this.value;
        if (inicio && fin && inicio >= fin) {
            this.setCustomValidity('La hora final debe ser después de la hora inicial');
            mostrarMensaje('La hora final debe ser después de la hora inicial', 'error');
        } else {
            this.setCustomValidity('');
        }
    });
});

// Mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo) {
    // Limpiar mensajes anteriores
    const mensajesAnteriores = document.querySelectorAll('.alert-mensaje');
    mensajesAnteriores.forEach(msg => msg.remove());
    
    const contenedor = document.createElement('div');
    contenedor.className = `alert alert-${tipo === 'error' ? 'danger' : 'success'} mt-3 alert-mensaje`;
    contenedor.textContent = mensaje;
    
    const forms = document.querySelector('.container');
    forms.insertBefore(contenedor, forms.firstChild);
    
    setTimeout(() => contenedor.remove(), 5000);
}

// Cargar todas las reservas
async function cargarReservas() {
    try {
        mostrarMensaje('Cargando reservas...', 'info');
        
        const response = await fetch('/api/reservas');
        
        if (!response.ok) {
            throw new Error('Error al cargar reservas');
        }
        
        const reservas = await response.json();
        
        const tableBody = document.getElementById('reservasTable');
        tableBody.innerHTML = '';
        
        if (reservas.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay reservas registradas</td></tr>';
            return;
        }
        
        reservas.forEach(reserva => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${reserva.id}</td>
                <td>${reserva.usuario_id}</td>
                <td>${reserva.sala_id}</td>
                <td>${reserva.fecha}</td>
                <td>${reserva.hora_inicio} - ${reserva.hora_fin}</td>
                <td><span class="badge bg-${reserva.estado === 'confirmada' ? 'success' : 'warning'}">${reserva.estado || 'pendiente'}</span></td>
                <td>
                    <button onclick="cancelarReserva('${reserva.id}')" 
                            class="btn btn-danger btn-sm action-btn"
                            ${reserva.estado === 'confirmada' ? 'disabled' : ''}>
                        Cancelar
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        mostrarMensaje('Error al cargar reservas: ' + error.message, 'error');
        console.error('Error al cargar reservas:', error);
    }
}

// Cancelar una reserva
async function cancelarReserva(id) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    
    try {
        mostrarMensaje('Cancelando reserva...', 'info');
        
        const response = await fetch(`/api/reservas/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cancelar reserva');
        }
        
        mostrarMensaje('Reserva cancelada exitosamente', 'success');
        cargarReservas();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
        console.error('Error al cancelar reserva:', error);
    }
}