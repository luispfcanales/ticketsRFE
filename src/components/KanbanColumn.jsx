import { Droppable } from '@hello-pangea/dnd';
import { TicketCard } from './TicketCard';

export const KanbanColumn = ({ columnId, title, color, dot, tickets, onEdit, onDelete }) => {
    return (
        <div className="flex flex-col w-full shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`}></span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                    {tickets.length}
                </span>
                <div className={`flex-1 h-px bg-gradient-to-r ${color} opacity-30`}></div>
            </div>

            <Droppable droppableId={columnId} direction="horizontal">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col overflow-hidden gap-1.5 px-1 rounded-lg transition-all duration-200 
                            ${tickets.length > 0 ? 'py-1 min-h-[40px]' : 'py-0.5 min-h-[40px]'}
                            ${snapshot.isDraggingOver ? 'bg-violet-50 ring-1 ring-violet-300/40' : 'bg-transparent'}
                        `}
                    >
                        {tickets.map((ticket, index) => (
                            <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                index={index}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};
