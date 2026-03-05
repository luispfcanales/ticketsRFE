const API_URL = import.meta.env.VITE_API_URL || 'https://rainforestregisterpersonal.vercel.app';

/**
 * Mapea los campos del backend (inglés) a los del frontend (español)
 */
const mapBackendToFrontend = (ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    asunto: ticket.subject,
    areaSolicitante: ticket.request_area,
    importancia: ticket.priority,
    estado: ticket.status,
    tags: ticket.tags || [],
    link: ticket.link || '',
    fechaReporte: ticket.report_date,
    fechaCierre: ticket.closed_date || null,
});

/**
 * Mapea los campos del frontend (español) a los del backend (inglés)
 */
const mapFrontendToBackend = (ticket) => {
    const backendTicket = {
        ticket_number: ticket.ticketNumber || '',
        subject: ticket.asunto,
        request_area: ticket.areaSolicitante,
        priority: ticket.importancia,
        status: ticket.estado,
        tags: ticket.tags || [],
        link: ticket.link || '',
    };

    // Incluir id y fechaReporte si existen (para actualizaciones)
    if (ticket.id) backendTicket.id = ticket.id;
    if (ticket.fechaReporte) backendTicket.report_date = ticket.fechaReporte;

    // Incluir fechaCierre si existe y el estado es cerrado
    if (ticket.estado === 'cerrado' && ticket.fechaCierre) {
        backendTicket.closed_date = ticket.fechaCierre;
    }

    return backendTicket;
};

/**
 * GET /api/tickets/list — Obtener todos los tickets
 */
export const fetchTickets = async () => {
    const res = await fetch(`${API_URL}/api/tickets/list`);
    if (!res.ok) throw new Error('Error al obtener tickets');
    const json = await res.json();
    return json.data.map(mapBackendToFrontend);
};

/**
 * GET /api/tickets/get?id={id} — Obtener un ticket por ID
 */
export const fetchTicketById = async (id) => {
    const res = await fetch(`${API_URL}/api/tickets/get?id=${id}`);
    if (!res.ok) throw new Error('Error al obtener ticket');
    const json = await res.json();
    return mapBackendToFrontend(json.data);
};

/**
 * POST /api/tickets/create — Crear un nuevo ticket
 */
export const createTicket = async (ticketData) => {
    const body = mapFrontendToBackend(ticketData);
    const res = await fetch(`${API_URL}/api/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Error al crear ticket');
    const json = await res.json();
    return mapBackendToFrontend(json.data);
};

/**
 * PUT /api/tickets/update — Actualizar un ticket completo
 */
export const updateTicket = async (ticketData) => {
    const body = mapFrontendToBackend(ticketData);
    const res = await fetch(`${API_URL}/api/tickets/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Error al actualizar ticket');
    const json = await res.json();
    return mapBackendToFrontend(json.data);
};

/**
 * PATCH /api/tickets/status — Actualizar solo el estado (drag & drop)
 */
export const updateTicketStatus = async (id, status) => {
    const res = await fetch(`${API_URL}/api/tickets/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
    });
    if (!res.ok) throw new Error('Error al actualizar estado');
    const json = await res.json();
    return json;
};

/**
 * DELETE /api/tickets/delete?id={id} — Eliminar un ticket
 */
export const deleteTicket = async (id) => {
    const res = await fetch(`${API_URL}/api/tickets/delete?id=${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar ticket');
    const json = await res.json();
    return json;
};
