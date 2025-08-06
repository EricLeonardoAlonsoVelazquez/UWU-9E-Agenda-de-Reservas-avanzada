document.addEventListener('DOMContentLoaded', () => {
    // Verificar rol al cargar la página
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    
    if (userRole !== 'admin') {
        alert('Acceso denegado');
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar información del administrador
    document.getElementById('adminName').textContent = userName;
    document.getElementById('adminRole').textContent = `(${userRole})`;

    // Elementos UI
    const salasSection = document.getElementById('salas-section');
    const usuariosSection = document.getElementById('usuarios-section');
    const reservasSection = document.getElementById('reservas-section');
    const navLinks = document.querySelectorAll('.nav-link');
    const logoutBtn = document.getElementById('logoutBtn');
    const addSalaBtn = document.getElementById('addSalaBtn');
    const addUsuarioBtn = document.getElementById('addUsuarioBtn');
    const saveSalaBtn = document.getElementById('saveSalaBtn');
    const saveUsuarioBtn = document.getElementById('saveUsuarioBtn');
    const salaForm = document.getElementById('salaForm');
    const usuarioForm = document.getElementById('usuarioForm');
    
    // Manejar navegación
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = e.target.dataset.target;
            
            // Actualizar navegación activa
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            // Mostrar sección correspondiente
            salasSection.classList.add('d-none');
            usuariosSection.classList.add('d-none');
            reservasSection.classList.add('d-none');
            
            if (target === 'salas') {
                salasSection.classList.remove('d-none');
                loadSalas();
            } else if (target === 'usuarios') {
                usuariosSection.classList.remove('d-none');
                loadUsuarios();
            } else if (target === 'reservas') {
                reservasSection.classList.remove('d-none');
                loadReservas();
            } else if (target === 'logout') {
                logout();
            }
        });
    });
    
    // Cargar datos iniciales
    loadSalas();
    
    // Evento para logout
    logoutBtn.addEventListener('click', logout);
    
    // Evento para añadir sala
    addSalaBtn.addEventListener('click', () => {
        salaForm.reset();
        document.getElementById('salaModalTitle').textContent = 'Nueva Sala';
        document.getElementById('salaId').value = '';
    });
    
    // Evento para guardar sala
    saveSalaBtn.addEventListener('click', saveSala);
    
    // Evento para añadir usuario
    addUsuarioBtn.addEventListener('click', () => {
        usuarioForm.reset();
        document.getElementById('usuarioModalTitle').textContent = 'Nuevo Usuario';
        document.getElementById('usuarioId').value = '';
        document.getElementById('usuarioPassword').required = true;
    });
    
    // Evento para guardar usuario
    saveUsuarioBtn.addEventListener('click', saveUsuario);
    
    // Funciones
    async function loadSalas() {
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch('/api/admin/salas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al cargar salas');
            
            const salas = await response.json();
            renderSalas(salas);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function loadUsuarios() {
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch('/api/admin/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al cargar usuarios');
            
            const usuarios = await response.json();
            renderUsuarios(usuarios);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function loadReservas() {
        try {
            const token = localStorage.getItem('firebaseToken');
            
            // Obtener reservas
            const reservasResponse = await fetch('/api/admin/reservas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!reservasResponse.ok) throw new Error('Error al cargar reservas');
            const reservas = await reservasResponse.json();

            // Obtener usuarios
            const usuariosResponse = await fetch('/api/admin/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!usuariosResponse.ok) throw new Error('Error al cargar usuarios');
            const usuarios = await usuariosResponse.json();

            // Crear mapa de usuarios (ID -> Nombre)
            const userMap = {};
            usuarios.forEach(usuario => {
                userMap[usuario.uid] = usuario.nombre;
            });

            // Renderizar reservas con el mapa de usuarios
            renderReservas(reservas, userMap);
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    function renderSalas(salas) {
        const tableBody = document.getElementById('salasTable');
        tableBody.innerHTML = '';
        
        salas.forEach(sala => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sala.id}</td>
                <td>${sala.nombre}</td>
                <td>${sala.capacidad}</td>
                <td>${sala.equipamiento?.join(', ') || 'N/A'}</td>
                <td>${sala.estado}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-sala-btn me-1" data-id="${sala.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-sala-btn" data-id="${sala.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-sala-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const salaId = e.target.closest('button').dataset.id;
                editSala(salaId);
            });
        });
        
        document.querySelectorAll('.delete-sala-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const salaId = e.target.closest('button').dataset.id;
                deleteSala(salaId);
            });
        });
    }
    
    function renderUsuarios(usuarios) {
        const tableBody = document.getElementById('usuariosTable');
        tableBody.innerHTML = '';
        
        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${usuario.uid}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td>${usuario.role}</td>
                <td>${usuario.status}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-usuario-btn me-1" data-id="${usuario.uid}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-usuario-btn" data-id="${usuario.uid}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones
        document.querySelectorAll('.edit-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const usuarioId = e.target.closest('button').dataset.id;
                editUsuario(usuarioId);
            });
        });
        
        document.querySelectorAll('.delete-usuario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const usuarioId = e.target.closest('button').dataset.id;
                deleteUsuario(usuarioId);
            });
        });
    }
    
    function renderReservas(reservas, userMap) {
        const tableBody = document.getElementById('reservasTable');
        tableBody.innerHTML = '';
        
        if (reservas.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="bi bi-calendar-x fs-1 text-muted"></i>
                        <p class="mt-2">No hay reservas registradas</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        reservas.forEach(reserva => {
            // Obtener nombre de usuario usando el mapa
            const userName = userMap[reserva.usuario_id] || 'Usuario Desconocido';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reserva.id}</td>
                <td>${reserva.sala_nombre || 'Sala Desconocida'}</td>
                <td>${userName}</td>
                <td>${reserva.fecha}</td>
                <td>${reserva.hora_inicio}</td>
                <td>${reserva.hora_fin}</td>
                <td>
                    <span class="badge bg-${getEstadoBadge(reserva.estado)}">
                        ${reserva.estado}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger delete-reserva-btn" data-id="${reserva.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('.delete-reserva-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservaId = e.target.closest('button').dataset.id;
                eliminarReserva(reservaId);
            });
        });
    }
    
    async function editSala(salaId) {
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch(`/api/admin/salas/${salaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener sala');
            
            const sala = await response.json();
            
            // Llenar formulario
            document.getElementById('salaId').value = sala.id;
            document.getElementById('salaNombre').value = sala.nombre;
            document.getElementById('salaCapacidad').value = sala.capacidad;
            document.getElementById('salaEquipamiento').value = sala.equipamiento?.join(', ') || '';
            document.getElementById('salaEstado').value = sala.estado;
            
            document.getElementById('salaModalTitle').textContent = 'Editar Sala';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('salaModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function saveSala() {
        try {
            const token = localStorage.getItem('firebaseToken');
            const salaId = document.getElementById('salaId').value;
            const method = salaId ? 'PUT' : 'POST';
            const url = salaId ? `/api/admin/salas/${salaId}` : '/api/admin/salas';
            
            const equipamiento = document.getElementById('salaEquipamiento').value
                .split(',')
                .map(item => item.trim())
                .filter(item => item);
            
            const salaData = {
                nombre: document.getElementById('salaNombre').value,
                capacidad: parseInt(document.getElementById('salaCapacidad').value),
                equipamiento: equipamiento,
                estado: document.getElementById('salaEstado').value
            };
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(salaData)
            });
            
            if (!response.ok) throw new Error('Error al guardar sala');
            
            const result = await response.json();
            
            // Cerrar modal y recargar datos
            const modal = bootstrap.Modal.getInstance(document.getElementById('salaModal'));
            modal.hide();
            
            loadSalas();
            alert(salaId ? 'Sala actualizada exitosamente' : 'Sala creada exitosamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function deleteSala(salaId) {
        if (!confirm('¿Estás seguro de eliminar esta sala?')) return;
        
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch(`/api/admin/salas/${salaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Manejar respuestas no exitosas
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar sala');
            }
            
            // Recargar la lista de salas
            loadSalas();
            alert('Sala eliminada exitosamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    async function editUsuario(usuarioId) {
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener usuario');
            
            const usuario = await response.json();
            
            // Llenar formulario
            document.getElementById('usuarioId').value = usuario.uid;
            document.getElementById('usuarioNombre').value = usuario.nombre;
            document.getElementById('usuarioEmail').value = usuario.email;
            document.getElementById('usuarioRol').value = usuario.role;
            document.getElementById('usuarioEstado').value = usuario.status;
            
            document.getElementById('usuarioPassword').required = false;
            document.getElementById('usuarioModalTitle').textContent = 'Editar Usuario';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    function getEstadoBadge(estado) {
        switch(estado.toLowerCase()) {
            case 'pendiente': return 'warning';
            case 'confirmada': return 'success';
            case 'cancelada': return 'danger';
            default: return 'secondary';
        }
    }
    
    async function saveUsuario() {
        try {
            const token = localStorage.getItem('firebaseToken');
            const usuarioId = document.getElementById('usuarioId').value;
            const method = usuarioId ? 'PUT' : 'POST';
            const url = usuarioId ? `/api/admin/usuarios/${usuarioId}` : '/api/admin/usuarios';
            
            const usuarioData = {
                nombre: document.getElementById('usuarioNombre').value,
                email: document.getElementById('usuarioEmail').value,
                role: document.getElementById('usuarioRol').value,
                status: document.getElementById('usuarioEstado').value
            };
            
            // Solo incluir contraseña si se está creando o cambiando
            const password = document.getElementById('usuarioPassword').value;
            if (password) {
                usuarioData.password = password;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usuarioData)
            });
            
            if (!response.ok) throw new Error('Error al guardar usuario');
            
            const result = await response.json();
            
            // Cerrar modal y recargar datos
            const modal = bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
            modal.hide();
            
            loadUsuarios();
            alert(usuarioId ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function deleteUsuario(usuarioId) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch(`/api/admin/usuarios/${usuarioId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al eliminar usuario');
            
            loadUsuarios();
            alert('Usuario eliminado exitosamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }
    
    async function eliminarReserva(reservaId) {
        if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;
        
        try {
            const token = localStorage.getItem('firebaseToken');
            const response = await fetch(`/api/admin/reservas/${reservaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al eliminar reserva');
            
            loadReservas();
            alert('Reserva eliminada exitosamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }

    function logout() {
        localStorage.removeItem('firebaseToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        window.location.href = 'login.html';
    }
});