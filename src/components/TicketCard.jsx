import { Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { Pencil, X, ExternalLink, Lock, FileText, Tag, Clock, Eye } from 'lucide-react';
import { useTickets } from '../context/TicketContext';

const priorityConfig = {
    'critico': { color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300', label: 'Crítico' },
    'Alta (Seguridad)': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
    'Alta (Desarrollo)': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
    'Media (Operativo)': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Media' },
    'Baja': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Baja' }
};

export const TicketCard = ({ ticket, index, onEdit, onDelete, draggingId }) => {
    const { isAdmin, tickets } = useTickets();
    const priority = priorityConfig[ticket.importancia] || priorityConfig['Media (Operativo)'];
    
    // Buscar ticket relacionado para mostrar su código
    const relatedTicket = ticket.referenciaTicketId
        ? tickets.find(t => t.id === ticket.referenciaTicketId)
        : null;

    // Un ticket debe contraerse si hay otro ticket siendo arrastrado
    const shouldContract = draggingId && draggingId !== ticket.id;

    // Clasificar etiquetas especiales y normales
    const specialTags = [];
    const regularTags = [];
    if (ticket.tags) {
        ticket.tags.forEach(tag => {
            const t = tag.toLowerCase().trim();
            if (t === 'cotización' || t === 'cotizacion') {
                specialTags.push({
                    label: 'Cotización',
                    classes: 'bg-rose-50 text-rose-600 border-rose-200',
                    icon: <FileText size={11} />
                });
            } else if (t === 'atendido parcialmente') {
                specialTags.push({
                    label: 'Atendido Parcialmente',
                    classes: 'bg-amber-50 text-amber-600 border-amber-200',
                    icon: <Clock size={11} />
                });
            } else if (t === 'en revisión por rfe' || t === 'en revision por rfe' || t === 'en revisión rfe' || t === 'en revision rfe') {
                specialTags.push({
                    label: 'En Revisión por RFE',
                    classes: 'bg-violet-50 text-violet-600 border-violet-200',
                    icon: <Eye size={11} />
                });
            } else if (tag.trim()) {
                regularTags.push(tag.trim());
            }
        });
    }

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
                        {/* 1. ID, Link y PDF */}
                        <div className="flex items-center gap-1.5 w-24 shrink-0">
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
                            {ticket.cotizacionPdfData && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newTab = window.open();
                                        if (newTab) {
                                            newTab.document.write(
                                                `<iframe src="${ticket.cotizacionPdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                            );
                                        }
                                    }}
                                    className="text-gray-400 hover:text-emerald-500 transition-colors"
                                    title="Ver cotización PDF"
                                >
                                    <FileText size={11} />
                                </button>
                            )}
                        </div>

                        {/* 2. Asunto y Ref */}
                        <div className="font-semibold text-gray-800 text-[12px] flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="truncate" title={ticket.asunto}>{ticket.asunto}</span>
                            {relatedTicket && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(relatedTicket);
                                    }}
                                    className="text-[9px] font-mono font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-1 py-0.5 rounded border border-violet-200 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                    title={`Relacionado con: ${relatedTicket.asunto}`}
                                >
                                    Ref: {relatedTicket.ticketNumber || relatedTicket.id}
                                </button>
                            )}
                        </div>

                        {/* 3. Área y Asignado */}
                        <div className="text-gray-500 truncate text-[10px] w-32 shrink-0 flex flex-col gap-0.5">
                            <span className="font-bold text-gray-700">{ticket.areaSolicitante}</span>
                            {ticket.asignadoA && <span className="text-[9px] text-gray-400 truncate">Asig: {ticket.asignadoA}</span>}
                        </div>

                        {/* 4. Prioridad, Tags y Pago */}
                        <div className="flex items-center gap-1.5 w-56 shrink-0 justify-end flex-wrap">
                            {ticket.tipo && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap shrink-0">
                                    {ticket.tipo}
                                </span>
                            )}
                            {ticket.pagado && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                                    Pagado
                                </span>
                            )}
                            {/* Special tag badges */}
                            {specialTags.map((stag, i) => (
                                <span
                                    key={`stag-${i}`}
                                    className={`p-1 rounded border flex items-center justify-center shrink-0 shadow-sm ${stag.classes}`}
                                    title={stag.label}
                                >
                                    {stag.icon}
                                </span>
                            ))}
                            {/* Regular tags */}
                            {regularTags.map((tag, i) => (
                                <span
                                    key={`rtag-${i}`}
                                    className="p-1 rounded border flex items-center justify-center shrink-0 bg-gray-50 text-gray-500 border-gray-200 shadow-sm"
                                    title={tag}
                                >
                                    <Tag size={11} />
                                </span>
                            ))}
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
