import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { app } from "./login.js";

const auth = getAuth(app);

// Configuración global
const API_BASE_URL = '/api';

// Funciones auxiliares
function mostrarMensaje(mensaje, tipo = 'success') {
    const globalMessage = document.getElementById('globalMessage');
    globalMessage.textContent = mensaje;
    globalMessage.className = `alert-message alert alert-${tipo === 'error' ? 'danger' : 'success'}`;
    globalMessage.style.display = 'block';
    
    setTimeout(() => {
        globalMessage.style.display = 'none';
    }, 5000);
}

// Cargar reservas al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarReservas();
    setupEventListeners();
});

function setupEventListeners() {
    // Formulario de reserva
    document.getElementById('reservaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearReserva();
    });

    // Formulario de disponibilidad
    document.getElementById('disponibilidadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await verificarDisponibilidad();
    });

    // Validación de horas
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
}

async function crearReserva() {
    try {
        const reserva = {
            usuario_id: document.getElementById('usuarioId').value.trim(),
            sala_id: document.getElementById('salaId').value.trim(),
            fecha: document.getElementById('fecha').value,
            hora_inicio: document.getElementById('horaInicio').value,
            hora_fin: document.getElementById('horaFin').value
        };

        // Validaciones
        if (!reserva.usuario_id || !reserva.sala_id || !reserva.fecha || !reserva.hora_inicio || !reserva.hora_fin) {
            throw new Error('Todos los campos son obligatorios');
        }

        if (reserva.hora_inicio >= reserva.hora_fin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin');
        }

        const response = await fetch(`${API_BASE_URL}/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
            },
            body: JSON.stringify(reserva)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.error || responseData.message || 'Error al crear reserva');
        }

        mostrarMensaje(`Reserva creada exitosamente! ID: ${responseData.id}`);
        document.getElementById('reservaForm').reset();
        cargarReservas();
    } catch (error) {
        console.error('Error al crear reserva:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}

async function verificarDisponibilidad() {
    try {
        const params = new URLSearchParams({
            salaId: document.getElementById('dispSalaId').value.trim(),
            fecha: document.getElementById('dispFecha').value,
            horaInicio: document.getElementById('dispHoraInicio').value,
            horaFin: document.getElementById('dispHoraFin').value
        });

        const response = await fetch(`${API_BASE_URL}/reservas/check-disponibilidad?${params}`, {
            headers: {
                'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
            }
        });

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
        console.error('Error al verificar disponibilidad:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}

async function cargarReservas() {
    try {
        const response = await fetch(`${API_BASE_URL}/reservas`, {
            headers: {
                'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
            }
        });

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

        tableBody.innerHTML = reservas.map(reserva => `
            <tr>
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
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}

// Función global para cancelar reservas
window.cancelarReserva = async (id) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cancelar reserva');
        }

        mostrarMensaje('Reserva cancelada exitosamente');
        cargarReservas();
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}