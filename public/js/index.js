document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const elements = {
        salasContainer: document.getElementById('salasContainer'),
        reservaContainer: document.getElementById('reservaContainer'),
        salaNombre: document.getElementById('salaNombre'),
        salaCapacidad: document.getElementById('salaCapacidad'),
        salaEquipamiento: document.getElementById('salaEquipamiento'),
        horariosSection: document.getElementById('horariosSection'),
        horariosContainer: document.getElementById('horariosContainer'),
        reservaBtn: document.getElementById('reservarBtn'),
        reservaMessage: document.getElementById('reservaMessage'),
        submitText: document.getElementById('submitText'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        logoutBtn: document.getElementById('logoutBtn'),
        userName: document.getElementById('userName'),
        userAvatar: document.getElementById('userAvatar'),
        reservasTable: document.getElementById('reservasTable'),
        calendarDays: document.getElementById('calendarDays'),
        currentMonth: document.getElementById('currentMonth'),
        prevMonth: document.getElementById('prevMonth'),
        nextMonth: document.getElementById('nextMonth'),
        fechaSeleccionada: document.getElementById('fechaSeleccionada')
    };

    // Variables de estado
    let salaSeleccionada = null;
    let fechaSeleccionada = null;
    let intervaloSeleccionado = null;
    let currentDate = new Date();
    let selectedDayElement = null;
    
    // Verificar autenticación
    if (!localStorage.getItem('firebaseToken')) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar información del usuario
    const userNameValue = localStorage.getItem('userName') || 'Usuario';
    elements.userName.textContent = userNameValue;
    elements.userAvatar.textContent = userNameValue.charAt(0).toUpperCase();

    // Cargar salas disponibles
    cargarSalas();
    
    // Cargar reservas del usuario
    cargarReservas();
    
    // Generar calendario inicial
    generarCalendario(currentDate);
    
    // Eventos de navegación del calendario
    elements.prevMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generarCalendario(currentDate);
    });
    
    elements.nextMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generarCalendario(currentDate);
    });
    
    // Evento del botón de reserva
    elements.reservaBtn.addEventListener('click', async () => {
        await crearReserva();
    });
    
    // Configurar cierre de sesión
    elements.logoutBtn.addEventListener('click', logout);
    
    // ===== FUNCIONES PRINCIPALES =====
    
    async function cargarSalas() {
        try {
            const response = await fetch('/api/salas', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
            const salas = await response.json();
            
            elements.salasContainer.innerHTML = '';
            
            salas.forEach(sala => {
                const salaCard = document.createElement('div');
                salaCard.className = 'col-md-6 mb-3 sala-card';
                salaCard.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${sala.nombre}</h5>
                            <p class="card-text">
                                <span class="badge bg-info">Capacidad: ${sala.capacidad}</span>
                                <small class="d-block mt-2">${sala.equipamiento || 'Sin equipamiento adicional'}</small>
                            </p>
                        </div>
                    </div>
                `;
                
                salaCard.addEventListener('click', () => {
                    document.querySelectorAll('.sala-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    salaCard.classList.add('selected');
                    seleccionarSala(sala.id, sala);
                });
                
                elements.salasContainer.appendChild(salaCard);
            });
        } catch (error) {
            console.error('Error al cargar salas:', error);
            elements.salasContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">Error cargando salas: ${error.message}</div>
                </div>
            `;
        }
    }
    
    function seleccionarSala(salaId, sala) {
        salaSeleccionada = salaId;
        elements.salaNombre.textContent = sala.nombre;
        elements.salaCapacidad.textContent = `Capacidad: ${sala.capacidad}`;
        elements.salaEquipamiento.textContent = sala.equipamiento || 'Equipamiento no especificado';
        elements.reservaContainer.style.display = 'block';
        
        // Resetear selecciones anteriores
        fechaSeleccionada = null;
        intervaloSeleccionado = null;
        elements.horariosSection.style.display = 'none';
        elements.reservaBtn.disabled = true;
        
        // Actualizar calendario
        generarCalendario(currentDate);
        
        // Deseleccionar cualquier día seleccionado
        if (selectedDayElement) {
            selectedDayElement.classList.remove('bg-selected');
            selectedDayElement = null;
        }
    }
    
    // Función para formatear fechas en la zona horaria local (YYYY-MM-DD)
    function formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Función para crear fecha sin horas/minutos/segundos
    function createDateWithoutTime(year, month, day) {
        return new Date(year, month, day, 0, 0, 0, 0);
    }
    
    async function generarCalendario(date) {
        elements.calendarDays.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div>';
        
        // Actualizar el encabezado del mes
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                           "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        elements.currentMonth.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        try {
            // Obtener disponibilidad para este mes
            const disponibilidad = salaSeleccionada 
                ? await obtenerDisponibilidad(date.getFullYear(), date.getMonth() + 1)
                : {};
            
            // Generar calendario
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const daysInMonth = lastDay.getDate();
            
            // Determinar en qué día de la semana comienza el mes (0 = Domingo, 1 = Lunes, etc.)
            let startingDay = firstDay.getDay();
            // Ajustar para que la semana comience en lunes
            if (startingDay === 0) startingDay = 7; // Domingo se convierte en 7
            
            elements.calendarDays.innerHTML = '';
            
            // Crear celdas vacías para los días anteriores al primer día del mes
            for (let i = 1; i < startingDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'day empty';
                elements.calendarDays.appendChild(emptyDay);
            }
            
            // Crear celdas para cada día del mes
            const today = createDateWithoutTime(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dayDate = createDateWithoutTime(date.getFullYear(), date.getMonth(), i);
                const dateKey = formatDateLocal(dayDate);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'day';
                dayElement.textContent = i;
                dayElement.dataset.date = dateKey;
                
                // Verificar si es hoy
                if (dayDate.getTime() === today.getTime()) {
                    dayElement.classList.add('bg-hoy');
                }
                
                // Verificar disponibilidad
                if (salaSeleccionada) {
                    const estado = disponibilidad[dateKey] || 'libre';
                    
                    if (estado === 'ocupado') {
                        dayElement.classList.add('bg-ocupado');
                    } else if (estado === 'parcial') {
                        dayElement.classList.add('bg-parcial');
                    } else {
                        dayElement.classList.add('bg-libre');
                    }
                    
                    // Permitir selección solo si no es un día pasado
                    if (dayDate >= today) {
                        dayElement.addEventListener('click', () => {
                            // Deseleccionar día anterior
                            if (selectedDayElement) {
                                selectedDayElement.classList.remove('bg-selected');
                            }
                            
                            // Seleccionar nuevo día
                            dayElement.classList.add('bg-selected');
                            selectedDayElement = dayElement;
                            
                            // Actualizar estado
                            fechaSeleccionada = dateKey;
                            elements.fechaSeleccionada.textContent = formatearFechaCorta(dayDate);
                            mostrarHorariosDisponibles(dateKey);
                        });
                    } else {
                        dayElement.classList.add('disabled');
                    }
                } else {
                    dayElement.classList.add('disabled');
                }
                
                // Resaltar si es la fecha seleccionada
                if (fechaSeleccionada === dateKey) {
                    dayElement.classList.add('bg-selected');
                    selectedDayElement = dayElement;
                }
                
                elements.calendarDays.appendChild(dayElement);
            }
        } catch (error) {
            console.error('Error al generar calendario:', error);
            elements.calendarDays.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">Error cargando disponibilidad: ${error.message}</div>
                </div>
            `;
        }
    }
    
    async function obtenerDisponibilidad(year, month) {
        if (!salaSeleccionada) return {};
        
        try {
            const response = await fetch(`/api/disponibilidad-mensual/${salaSeleccionada}/${year}-${month.toString().padStart(2, '0')}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error al obtener disponibilidad:', error);
            return {};
        }
    }
    
    async function mostrarHorariosDisponibles(fecha) {
        if (!salaSeleccionada) return;
        
        elements.horariosContainer.innerHTML = '<div class="col-12 text-center py-2"><div class="spinner-border spinner-border-sm"></div></div>';
        elements.horariosSection.style.display = 'block';
        elements.reservaBtn.disabled = true;
        intervaloSeleccionado = null;
        
        try {
            const response = await fetch(`/api/disponibilidad-horaria/${salaSeleccionada}/${fecha}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const horarios = await response.json();
            
            elements.horariosContainer.innerHTML = '';
            
            // Generar intervalos de 1 hora desde las 7:00 hasta las 22:00
            for (let hora = 7; hora <= 22; hora++) {
                const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
                const horaFin = `${(hora + 1).toString().padStart(2, '0')}:00`;
                
                // Verificar disponibilidad - manejar posibles valores undefined
                const disponible = horarios[horaInicio] === true;
                
                const horarioBtn = document.createElement('button');
                horarioBtn.type = 'button';
                horarioBtn.className = 'btn horario-btn ' + 
                    (disponible ? 'btn-outline-primary' : 'btn-outline-secondary disabled');
                    
                horarioBtn.textContent = `${horaInicio}-${horaFin}`;
                horarioBtn.dataset.inicio = horaInicio;
                horarioBtn.dataset.fin = horaFin;
                horarioBtn.disabled = !disponible;
                
                // Solo agregar evento si está disponible
                if (disponible) {
                    horarioBtn.addEventListener('click', function() {
                        // Deseleccionar cualquier otro botón
                        document.querySelectorAll('.horario-btn').forEach(btn => {
                            btn.classList.remove('btn-primary', 'active');
                            btn.classList.add('btn-outline-primary');
                        });
                        
                        // Seleccionar este horario
                        this.classList.remove('btn-outline-primary');
                        this.classList.add('btn-primary', 'active');
                        intervaloSeleccionado = `${horaInicio}-${horaFin}`;
                        
                        // Habilitar botón de reserva
                        elements.reservaBtn.disabled = false;
                    });
                }
                
                elements.horariosContainer.appendChild(horarioBtn);
            }
        } catch (error) {
            console.error('Error al obtener horarios disponibles:', error);
            elements.horariosContainer.innerHTML = `
                <div class="alert alert-danger">Error cargando horarios: ${error.message}</div>
            `;
        }
    }
    
    async function cargarReservas() {
        try {
            const response = await fetch('/api/reservas', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
            
            if (!response.ok) throw new Error('Error al obtener reservas');
            const reservas = await response.json();
            renderizarReservas(reservas);
        } catch (error) {
            console.error('Error al cargar reservas:', error);
            elements.reservasTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="alert alert-danger">${error.message}</div>
                    </td>
                </tr>
            `;
        }
    }
    
    async function crearReserva() {
        if (!intervaloSeleccionado) {
            mostrarMensaje('Por favor seleccione un horario', 'danger');
            return;
        }
        
        const intervalo = intervaloSeleccionado.split('-');
        if (intervalo.length !== 2) {
            mostrarMensaje('Horario no válido', 'danger');
            return;
        }
        
        const horaInicio = intervalo[0].trim();
        const horaFin = intervalo[1].trim();
        
        // Validar horas
        if (horaInicio >= horaFin) {
            mostrarMensaje('La hora de fin debe ser posterior a la hora de inicio', 'danger');
            return;
        }
        
        // Mostrar estado de carga
        toggleLoading(true);
        
        try {
            const reservaData = {
                sala_id: salaSeleccionada,
                fecha: fechaSeleccionada,
                hora_inicio: horaInicio,
                hora_fin: horaFin
            };
            
            const response = await fetch('/api/reservar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                },
                body: JSON.stringify(reservaData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al crear la reserva');
            }
            
            mostrarMensaje('¡Reserva creada exitosamente!', 'success');
            
            // Resetear selección
            intervaloSeleccionado = null;
            elements.reservaBtn.disabled = true;
            
            // Actualizar UI
            document.querySelectorAll('.horario-btn').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            
            await cargarReservas(); // Actualizar lista de reservas
            await generarCalendario(currentDate); // Actualizar calendario
        } catch (error) {
            console.error('Error en reserva:', error);
            mostrarMensaje(error.message, 'danger');
        } finally {
            toggleLoading(false);
        }
    }
    
    function renderizarReservas(reservas) {
        // Verificar si reservas es un array válido
        if (!Array.isArray(reservas) || reservas.length === 0) {
            elements.reservasTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="bi bi-calendar-x fs-1 text-muted"></i>
                        <p class="mt-2">No tienes reservas activas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.reservasTable.innerHTML = '';
        
        reservas.forEach(reserva => {
            const row = document.createElement('tr');
            row.className = 'reserva-row';
            row.innerHTML = `
                <td>${reserva.sala_nombre || 'Sala desconocida'}</td>
                <td>${formatearFecha(reserva.fecha)}</td>
                <td>${reserva.hora_inicio} - ${reserva.hora_fin}</td>
                <td>
                    <span class="badge bg-${getEstadoBadge(reserva.estado)}">
                        ${reserva.estado}
                    </span>
                </td>
                <td>
                    ${reserva.estado === 'pendiente' ? `
                        <button class="btn btn-sm btn-success me-2 confirm-btn" data-id="${reserva.id}">
                            <i class="bi bi-check-circle"></i> Confirmar
                        </button>
                        <button class="btn btn-sm btn-danger cancel-btn" data-id="${reserva.id}">
                            <i class="bi bi-trash"></i> Cancelar
                        </button>
                    ` : reserva.estado === 'confirmada' ? `
                        <span class="text-success fw-bold">Confirmada</span>
                    ` : `
                        <span class="text-muted">Cancelada</span>
                    `}
                </td>
            `;
            
            elements.reservasTable.appendChild(row);
            
            // Agregar eventos a los botones
            const confirmBtn = row.querySelector('.confirm-btn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    confirmarReserva(reserva.id);
                });
            }
            
            const cancelBtn = row.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cancelarReserva(reserva.id);
                });
            }
        });
    }
    
    // ===== FUNCIONES PARA CONFIRMAR/CANCELAR RESERVAS =====
    async function confirmarReserva(reservaId) {
        try {
            toggleLoading(true, `Confirmando reserva ${reservaId}...`);
            
            const response = await fetch(`/api/reservas/${reservaId}/confirmar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
                
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al confirmar la reserva');
            }
            
            mostrarMensaje('¡Reserva confirmada exitosamente!', 'success');
            await cargarReservas();
        } catch (error) {
            console.error('Error al confirmar reserva:', error);
            mostrarMensaje(error.message, 'danger');
        } finally {
            toggleLoading(false);
        }
    }
    
    async function cancelarReserva(reservaId) {
        if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
        
        try {
            toggleLoading(true, `Cancelando reserva ${reservaId}...`);
            
            const response = await fetch(`/api/reservas/${reservaId}/cancelar`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('firebaseToken')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cancelar la reserva');
            }
            
            mostrarMensaje('Reserva cancelada exitosamente', 'success');
            await cargarReservas();
            await generarCalendario(currentDate);
        } catch (error) {
            console.error('Error al cancelar reserva:', error);
            mostrarMensaje(error.message, 'danger');
        } finally {
            toggleLoading(false);
        }
    }
    
    function logout() {
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
    }
    
    // ===== FUNCIONES AUXILIARES =====
    
    function formatearFecha(fechaStr) {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-ES', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    function formatearFechaCorta(date) {
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }
    
    function getEstadoBadge(estado) {
        switch(estado.toLowerCase()) {
            case 'pendiente': return 'warning';
            case 'confirmada': return 'success';
            case 'cancelada': return 'danger';
            default: return 'secondary';
        }
    }
    
    function mostrarMensaje(texto, tipo) {
        elements.reservaMessage.textContent = texto;
        elements.reservaMessage.className = `alert alert-${tipo}`;
        elements.reservaMessage.style.display = 'block';
        
        setTimeout(() => {
            elements.reservaMessage.style.display = 'none';
        }, 5000);
    }
    
    function toggleLoading(mostrar, texto = 'Reservando...') {
        if (mostrar) {
            elements.submitText.textContent = texto;
            elements.loadingSpinner.style.display = 'inline-block';
            elements.reservaBtn.disabled = true;
            // Deshabilitar todos los botones durante la operación
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
            });
        } else {
            elements.submitText.textContent = 'Reservar Sala';
            elements.loadingSpinner.style.display = 'none';
            // Habilitar todos los botones después de la operación
            document.querySelectorAll('button').forEach(btn => {
                btn.disabled = false;
            });
            // Mantener el botón de reserva deshabilitado si no hay selección
            elements.reservaBtn.disabled = !intervaloSeleccionado;
        }
    }
});