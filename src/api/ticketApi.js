const API_URL = import.meta.env.VITE_API_URL || 'https://rainforestregisterpersonal.vercel.app';

/**
 * Mapea los campos del backend (inglés) a los del frontend (español)
 */
const mapBackendToFrontend = (ticket) => {
    let estado = ticket.status;
    let tags = ticket.tags || [];
    if (estado === 'en_cotizacion') {
        estado = 'en_proceso';
        if (!tags.includes('cotización')) tags = [...tags, 'cotización'];
    } else if (estado === 'atendido_parcialmente') {
        estado = 'en_proceso';
        if (!tags.includes('atendido parcialmente')) tags = [...tags, 'atendido parcialmente'];
    } else if (estado === 'en_revision') {
        estado = 'en_proceso';
        if (!tags.includes('en revisión por RFE')) tags = [...tags, 'en revisión por RFE'];
    }

    return {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        asunto: ticket.subject,
        areaSolicitante: ticket.request_area,
        importancia: ticket.priority,
        estado: estado,
        tags: tags,
        link: ticket.link || '',
        fechaReporte: ticket.report_date,
        fechaCierre: ticket.closed_date || null,
        
        // Nuevos campos
        fechaRespuestaRecibida: ticket.them_response_date || null,
        respuestaRecibida: ticket.them_response || '',
        fechaRespuestaEnviada: ticket.my_response_date || null,
        respuestaEnviada: ticket.my_response || '',
        referenciaTicketId: ticket.related_ticket_id || '',
        pagado: ticket.is_paid || false,
        cotizacionPdfData: ticket.quote_pdf_data || '',
        tipo: ticket.type || '',
        asignadoA: ticket.assigned_to || '',
        observations: ticket.observations || [],
    };
};

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
        
        them_response_date: ticket.fechaRespuestaRecibida || null,
        them_response: ticket.respuestaRecibida || '',
        my_response_date: ticket.fechaRespuestaEnviada || null,
        my_response: ticket.respuestaEnviada || '',
        related_ticket_id: ticket.referenciaTicketId || '',
        is_paid: ticket.pagado || false,
        quote_pdf_data: ticket.cotizacionPdfData || '',
        type: ticket.tipo || '',
        assigned_to: ticket.asignadoA || '',
        observations: ticket.observations || [],
    };

    // Incluir id y fechaReporte si existen (para actualizaciones)
    if (ticket.id) backendTicket.id = ticket.id;
    if (ticket.fechaReporte) backendTicket.report_date = ticket.fechaReporte;

    // Incluir fechaCierre si existe
    if (ticket.fechaCierre) {
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

/**
 * DELETE /api/tickets/clear — Eliminar TODOS los tickets de la base de datos
 */
export const clearAllTickets = async () => {
    const res = await fetch(`${API_URL}/api/tickets/clear`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al limpiar la base de datos de tickets');
    const json = await res.json();
    return json;
};

/**
 * Importa un array de tickets mapeados (campo frontend) enviándolos uno a uno.
 * Llama onProgress(done, total, errors) después de cada intento.
 *
 * @param {Array}    tickets    - Tickets en formato frontend
 * @param {Function} onProgress - (done: number, total: number, errors: string[]) => void
 * @returns {{ created: number, errors: string[] }}
 */
export const importTicketsBatch = async (tickets, onProgress) => {
    const total = tickets.length;
    let created = 0;
    const errors = [];

    for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        try {
            let finalStatus = ticket.estado || '';
            let finalTags = ticket.tags ? [...ticket.tags] : [];
            
            const lowerStatus = String(ticket.estado).toLowerCase().trim();
            if (lowerStatus.includes('cotiza') || lowerStatus.includes('cotización') || lowerStatus.includes('cotizacion')) {
                finalStatus = 'en_proceso';
                if (!finalTags.includes('cotización')) finalTags.push('cotización');
            } else if (lowerStatus.includes('parcial') || lowerStatus.includes('atendido parcialmente')) {
                finalStatus = 'en_proceso';
                if (!finalTags.includes('atendido parcialmente')) finalTags.push('atendido parcialmente');
            } else if (lowerStatus.includes('revision') || lowerStatus.includes('revisión') || lowerStatus.includes('revision por rfe') || lowerStatus.includes('revisión por rfe')) {
                finalStatus = 'en_proceso';
                if (!finalTags.includes('en revisión por RFE')) finalTags.push('en revisión por RFE');
            }

            const body = {
                ticket_number: ticket.ticketNumber || '',
                subject:       ticket.asunto || '',
                request_area:  ticket.areaSolicitante || '',
                priority:      ticket.importancia || '',
                status:        finalStatus,
                link:          ticket.link || '',
                report_date:   ticket.fechaReporte || '',
                them_response_date: ticket.fechaRespuesta || '',
                closed_date:   ticket.fechaResolucion || '',
                type:          ticket.tipo || '',
                assigned_to:   ticket.asignadoA || '',
                tags:          finalTags,
            };
            const res = await fetch(`${API_URL}/api/tickets/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
                throw new Error(errJson.message || `HTTP ${res.status}`);
            }
            created++;
        } catch (err) {
            errors.push(`#${ticket.ticketNumber}: ${err.message}`);
        }
        if (onProgress) onProgress(i + 1, total, [...errors]);
    }

    return { created, errors };
};
