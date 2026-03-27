import { Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { Pencil, X, ExternalLink, Lock } from 'lucide-react';
import { useTickets } from '../context/TicketContext';

const priorityConfig = {
    'critico': { color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', label: 'Crítico' },
    'Alta (Seguridad)': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
    'Alta (Desarrollo)': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
    'Media (Operativo)': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Media' },
    'Baja': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Baja' }
};

export const TicketCard = ({ ticket, index, onEdit, onDelete, draggingId }) => {
    const { isAdmin } = useTickets();
    const priority = priorityConfig[ticket.importancia] || priorityConfig['Media (Operativo)'];
    
    // Un ticket debe contraerse si hay otro ticket siendo arrastrado
    const shouldContract = draggingId && draggingId !== ticket.id;

    return (
        <Draggable draggableId={ticket.id} index={index} isDragDisabled={!isAdmin}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`shrink-0 rounded-md transition-all duration-200 group 
                        ${snapshot.isDragging 
                            ? 'bg-white border-2 border-indigo-500 z-50 shadow-2xl ring-4 ring-indigo-500/20 scale-[1.05] rotate-[0.5deg]' 
                            : shouldContract
                                ? 'h-1.5 py-0 px-0 bg-gray-200/40 border-none opacity-20 overflow-hidden shadow-none'
                                : 'bg-white border-gray-200 p-2 shadow-sm border hover:border-gray-300 hover:shadow-md'
                        }`}
                >
                    {shouldContract ? null : (
                        <div className="flex items-center gap-3">
                        {/* 1. ID y Link */}
                        <div className="flex items-center gap-1.5 w-20 shrink-0">
                            <span className="font-mono text-[10px] text-gray-500 font-medium">
                                {ticket.ticketNumber || ticket.id}
                            </span>
                            {ticket.link && (
                                <a
                                    href={ticket.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-violet-500 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={11} />
                                </a>
                            )}
                        </div>

                        {/* 2. Asunto */}
                        <div className="font-semibold text-gray-800 truncate text-[12px] flex-1">
                            {ticket.asunto}
                        </div>

                        {/* 3. Área */}
                        <div className="text-gray-500 truncate text-[10px] w-32 shrink-0">
                            {ticket.areaSolicitante}
                        </div>

                        {/* 4. Prioridad y Tags */}
                        <div className="flex items-center gap-2 w-48 shrink-0 justify-end">
                            {ticket.tags && ticket.tags.length > 0 && (
                                <div className="flex gap-1">
                                    {ticket.tags.slice(0, 1).map((tag, i) => (
                                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">
                                            {tag}
                                        </span>
                                    ))}
                                    {ticket.tags.length > 1 && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                            +{ticket.tags.length - 1}
                                        </span>
                                    )}
                                </div>
                            )}
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priority.color} ${priority.bg} ${priority.border}`}>
                                {priority.label}
                            </span>
                        </div>

                        {/* 5. Fecha e Indicador de días */}
                        <div className="flex items-center justify-end gap-1.5 w-24 shrink-0">
                            <span className="text-[10px] text-gray-400">
                                {ticket.fechaReporte ? format(new Date(ticket.fechaReporte), 'dd/MM/yy') : ''}
                            </span>
                            {ticket.fechaReporte && ticket.estado !== 'cerrado' && (
                                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-gray-100 text-gray-400">
                                    {Math.max(0, Math.floor((new Date() - new Date(ticket.fechaReporte)) / (1000 * 60 * 60 * 24)))}d
                                </span>
                            )}
                        </div>

                        {/* 6. Acciones */}
                        {isAdmin && (
                            <div className="flex gap-0.5 w-12 shrink-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                    onClick={() => onEdit(ticket)}
                                    title="Editar ticket"
                                >
                                    <Pencil size={12} />
                                </button>
                                <button
                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    onClick={() => onDelete(ticket.id)}
                                    title="Eliminar ticket"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        {!isAdmin && (
                            <div className="w-12 shrink-0 flex justify-end">
                                <Lock size={10} className="text-gray-300" />
                            </div>
                        )}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
};
