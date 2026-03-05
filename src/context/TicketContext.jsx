import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/ticketApi';

const TicketContext = createContext();

export const TicketProvider = ({ children }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar tickets del backend al montar
    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.fetchTickets();
            setTickets(data);
        } catch (err) {
            console.error('Error cargando tickets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const addTicket = async (ticketData) => {
        try {
            setError(null);
            const newTicket = await api.createTicket(ticketData);
            setTickets(prev => [newTicket, ...prev]);
            return newTicket;
        } catch (err) {
            console.error('Error creando ticket:', err);
            setError(err.message);
            throw err;
        }
    };

    const updateTicket = async (id, updatedFields) => {
        try {
            setError(null);
            // Actualización optimista
            setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));

            // Reconstruir ticket completo y enviarlo al backend
            const ticketToUpdate = tickets.find(t => t.id === id);
            if (ticketToUpdate) {
                await api.updateTicket({ ...ticketToUpdate, ...updatedFields });
            }
        } catch (err) {
            console.error('Error actualizando ticket:', err);
            setError(err.message);
            await loadTickets(); // Revertir con datos reales
            throw err;
        }
    };

    const deleteTicket = async (id) => {
        const prevTickets = tickets;
        try {
            setError(null);
            // Actualización optimista
            setTickets(prev => prev.filter(t => t.id !== id));
            await api.deleteTicket(id);
        } catch (err) {
            console.error('Error eliminando ticket:', err);
            setError(err.message);
            setTickets(prevTickets); // Revertir
            throw err;
        }
    };

    const updateTicketStatus = async (id, newStatus) => {
        const prevTickets = tickets;
        try {
            setError(null);

            // Si pasa a cerrado y no tiene fecha, le ponemos la actual. Si pasa a otro estado, la borramos.
            const nowISO = new Date().toISOString();

            // Actualización optimista para que el drag & drop se sienta inmediato
            setTickets(prev => prev.map(t => {
                if (t.id === id) {
                    const newTicket = { ...t, estado: newStatus };
                    if (newStatus === 'cerrado' && !t.fechaCierre) {
                        newTicket.fechaCierre = nowISO;
                    } else if (newStatus !== 'cerrado') {
                        newTicket.fechaCierre = null;
                    }
                    return newTicket;
                }
                return t;
            }));

            // El backend no soporta fechaCierre en el PATCH /status (según la API que me pasaste),
            // así que para asegurar que se guarde la fecha de cierre, enviamos el update completo si pasa a cerrado
            if (newStatus === 'cerrado' || prevTickets.find(t => t.id === id)?.estado === 'cerrado') {
                const ticketToUpdate = tickets.find(t => t.id === id);
                if (ticketToUpdate) {
                    const payload = { ...ticketToUpdate, estado: newStatus };
                    if (newStatus === 'cerrado' && !payload.fechaCierre) payload.fechaCierre = nowISO;
                    else if (newStatus !== 'cerrado') payload.fechaCierre = null;
                    await api.updateTicket(payload);
                    return;
                }
            }

            // Fallback al PATCH normal si solo es cambio entre columnas activas
            await api.updateTicketStatus(id, newStatus);
        } catch (err) {
            console.error('Error actualizando estado:', err);
            setError(err.message);
            setTickets(prevTickets); // Revertir
            throw err;
        }
    };

    return (
        <TicketContext.Provider value={{
            tickets,
            loading,
            error,
            addTicket,
            updateTicket,
            deleteTicket,
            updateTicketStatus,
            refreshTickets: loadTickets
        }}>
            {children}
        </TicketContext.Provider>
    );
};

export const useTickets = () => useContext(TicketContext);
