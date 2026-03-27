import { Droppable } from '@hello-pangea/dnd';
import { TicketCard } from './TicketCard';

export const KanbanColumn = ({ columnId, title, color, dot, tickets, onEdit, onDelete, draggingId, isDragging }) => {
    return (
        <div className={`flex flex-col w-full transition-all duration-300 ${isDragging ? 'flex-1 min-h-[120px] bg-indigo-50/10 border-2 border-indigo-200/50 border-dashed rounded-xl' : 'shrink-0'}`}>
            <div className={`flex items-center gap-2 px-2 py-1.5 ${isDragging ? 'border-b border-indigo-100 bg-white/50 rounded-t-xl' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${dot}`}></span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                    {tickets.length}
                </span>
                <div className={`flex-1 h-px bg-gradient-to-r ${color} opacity-30`}></div>
            </div>

            <Droppable droppableId={columnId} direction="vertical">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-1.5 px-1 rounded-b-lg transition-all duration-200 h-full
                            ${isDragging ? 'flex-1 min-h-[80px]' : ''}
                            ${tickets.length > 0 ? 'py-1' : 'py-0.5'}
                            ${snapshot.isDraggingOver ? 'bg-indigo-100/50 ring-2 ring-indigo-400/20' : 'bg-transparent'}
                        `}
                    >
                        {tickets.map((ticket, index) => (
                            <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                index={index}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                draggingId={draggingId}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};
