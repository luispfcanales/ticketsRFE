import { DragDropContext } from '@hello-pangea/dnd';
import { useTickets } from '../context/TicketContext';
import { KanbanColumn } from './KanbanColumn';
import { TicketFormModal } from './TicketFormModal';

const COLUMNS = [
    { id: 'nuevo', title: 'Nuevo', color: 'from-blue-500 to-cyan-400', dot: 'bg-blue-400' },
    { id: 'en_proceso', title: 'En Proceso', color: 'from-amber-500 to-orange-400', dot: 'bg-amber-400' },
    { id: 'en_cotizacion', title: 'En Cotización', color: 'from-pink-500 to-rose-400', dot: 'bg-pink-400' },
    { id: 'en_revision', title: 'En Revisión RFE', color: 'from-violet-500 to-purple-400', dot: 'bg-violet-400' },
    { id: 'cerrado', title: 'Cerrado', color: 'from-emerald-500 to-green-400', dot: 'bg-emerald-400' }
];

export const KanbanBoard = ({ searchQuery, modalState, onModalClose }) => {
    const { tickets, updateTicketStatus, addTicket, updateTicket, deleteTicket } = useTickets();

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        updateTicketStatus(draggableId, destination.droppableId);
    };

    const handleSave = async (ticketData) => {
        if (modalState.ticket) {
            await updateTicket(modalState.ticket.id, ticketData);
        } else {
            await addTicket(ticketData);
        }
    };

    const filteredTickets = tickets.filter(t =>
        (t.asunto || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.ticketNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.areaSolicitante || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTicketsByStatus = (status) => {
        return filteredTickets.filter(t => t.estado === status);
    };

    return (
        <div className="h-full flex flex-col gap-1">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col gap-1">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            columnId={col.id}
                            title={col.title}
                            color={col.color}
                            dot={col.dot}
                            tickets={getTicketsByStatus(col.id)}
                            onEdit={(ticket) => onModalClose(ticket)}
                            onDelete={deleteTicket}
                        />
                    ))}
                </div>
            </DragDropContext>

            <TicketFormModal
                isOpen={modalState.isOpen}
                onClose={() => onModalClose(null)}
                onSave={handleSave}
                ticket={modalState.ticket}
                tickets={tickets}
            />
        </div>
    );
};
