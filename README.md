**1. Agenda de Reservas Avanzada**

Descripción:
Crear una aplicación web para la gestión de reservas de salas con control de disponibilidad y notificaciones.

Requerimientos funcionales:
- CRUD de usuarios y salas.
- Calendario con reservas visibles y filtros por sala y fecha.
- Validación de conflictos de horario (reservas traslapadas).
- Confirmación automática por correo (simulado).
- Endpoint REST para consultar disponibilidad.

Base de datos sugerida:
- Usuarios(id, nombre, correo)
- Salas(id, nombre, capacidad)
- Reservas(id, usuario_id, sala_id, fecha, hora_inicio, hora_fin, estado)

Reglas de negocio:
- Control de traslapes entre reservas.
- Estados: pendiente, confirmada, cancelada.
- Una reserva confirmada no puede ser modificada.

Objetivo técnico:
- Evaluar validaciones complejas, manejo de estados y diseño RESTful.


![Alt Text](https://media.tenor.com/ZdsIbPaZn64AAAAM/verycat-cateat.gif)
