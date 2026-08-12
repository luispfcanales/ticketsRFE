import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Autocomplete, AutocompleteItem, Switch } from '@nextui-org/react';
import { Upload, FileText, X } from 'lucide-react';

const STANDARD_AREAS = ['CONTABILIDAD', 'SISTEMAS', 'LOGISTICA', 'RRHH', 'TSB'];
const STANDARD_TAGS = [
    '2do nivel',
    '3er nivel',
    'requiere reunión Teams',
    'cotización',
    'atendido parcialmente',
    'en revisión por RFE'
];

export const TicketFormModal = ({ isOpen, onClose, onSave, ticket, tickets = [] }) => {
    const [formData, setFormData] = useState({
        ticketNumber: '',
        asunto: '',
        areaSolicitante: '',
        tipo: '',
        asignadoA: '',
        importancia: 'Media (Operativo)',
        outline: '',
        estado: 'nuevo',
        tags: [],
        link: '',
        fechaReporte: '',
        fechaCierre: '',
        fechaRespuestaRecibida: '',
        respuestaRecibida: '',
        fechaRespuestaEnviada: '',
        respuestaEnviada: '',
        referenciaTicketId: '',
        pagado: false,
        cotizacionPdfData: '',
        observations: []
    });
    const [saving, setSaving] = useState(false);
    const [newObservationText, setNewObservationText] = useState('');

    // Extraer áreas únicas de forma inteligente (omitiendo duplicados por mayúsculas/espacios)
    const uniqueAreas = useMemo(() => {
        const areaMap = new Map();
        STANDARD_AREAS.forEach(area => areaMap.set(area.toLowerCase(), area));
        tickets.forEach(t => {
            if (!t.areaSolicitante) return;
            // Limpiar espacios al inicio/final y dobles espacios intermedios
            const cleanStr = t.areaSolicitante.trim().replace(/\s+/g, ' ');
            const key = cleanStr.toLowerCase();

            // Si no existe, lo agregamos. (Así "RRHH" y "rrhh" se agrupan en uno solo)
            if (!areaMap.has(key)) {
                areaMap.set(key, cleanStr);
            }
        });
        return Array.from(areaMap.values()).sort((a, b) => a.localeCompare(b));
    }, [tickets]);

    // Extraer asignados únicos
    const uniqueAssignees = useMemo(() => {
        const assigneeMap = new Map();
        tickets.forEach(t => {
            if (!t.asignadoA) return;
            const cleanStr = t.asignadoA.trim().replace(/\s+/g, ' ');
            const key = cleanStr.toLowerCase();
            if (!assigneeMap.has(key)) {
                assigneeMap.set(key, cleanStr);
            }
        });
        return Array.from(assigneeMap.values()).sort((a, b) => a.localeCompare(b));
    }, [tickets]);

    // Filtrar los demás tickets para la relación
    const otherTickets = useMemo(() => {
        return tickets.filter(t => t.id !== ticket?.id);
    }, [tickets, ticket]);

    useEffect(() => {
        if (ticket) {
            let normalizedStatus = ticket.estado || 'nuevo';
            let tags = ticket.tags || [];
            if (normalizedStatus === 'en_cotizacion') {
                normalizedStatus = 'en_proceso';
                if (!tags.includes('cotización')) tags = [...tags, 'cotización'];
            } else if (normalizedStatus === 'atendido_parcialmente') {
                normalizedStatus = 'en_proceso';
                if (!tags.includes('atendido parcialmente')) tags = [...tags, 'atendido parcialmente'];
            } else if (normalizedStatus === 'en_revision') {
                normalizedStatus = 'en_proceso';
                if (!tags.includes('en revisión por RFE')) tags = [...tags, 'en revisión por RFE'];
            }

            setFormData({
                ticketNumber: ticket.ticketNumber?.replace('#HT', '') || '',
                asunto: ticket.asunto || '',
                areaSolicitante: ticket.areaSolicitante || '',
                tipo: ticket.tipo || '',
                asignadoA: ticket.asignadoA || '',
                importancia: ticket.importancia || 'Media (Operativo)',
                estado: normalizedStatus,
                tags: tags,
                link: ticket.link || '',
                fechaReporte: ticket.fechaReporte ? ticket.fechaReporte.slice(0, 16) : '',
                fechaCierre: ticket.fechaCierre ? ticket.fechaCierre.slice(0, 16) : '',
                fechaRespuestaRecibida: ticket.fechaRespuestaRecibida ? ticket.fechaRespuestaRecibida.slice(0, 16) : '',
                respuestaRecibida: ticket.respuestaRecibida || '',
                fechaRespuestaEnviada: ticket.fechaRespuestaEnviada ? ticket.fechaRespuestaEnviada.slice(0, 16) : '',
                respuestaEnviada: ticket.respuestaEnviada || '',
                referenciaTicketId: ticket.referenciaTicketId || '',
                pagado: ticket.pagado || false,
                cotizacionPdfData: ticket.cotizacionPdfData || '',
                observations: ticket.observations || []
            });
        } else {
            setFormData({
                ticketNumber: '',
                asunto: '',
                areaSolicitante: '',
                tipo: '',
                asignadoA: '',
                importancia: 'Media (Operativo)',
                estado: 'nuevo',
                tags: [],
                link: '',
                fechaReporte: '',
                fechaCierre: '',
                fechaRespuestaRecibida: '',
                respuestaRecibida: '',
                fechaRespuestaEnviada: '',
                respuestaEnviada: '',
                referenciaTicketId: '',
                pagado: false,
                cotizacionPdfData: '',
                observations: []
            });
        }
        setNewObservationText('');
    }, [ticket, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Si cambiamos el estado a "cerrado" y no hay fecha de cierre, auto-completar la actual
            if (name === 'estado' && value === 'cerrado' && !prev.fechaCierre) {
                // Formato YYYY-MM-DDThh:mm compatible con datetime-local
                const now = new Date();
                const offset = now.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
                newData.fechaCierre = localISOTime;
            }
            // Si quitamos el estado cerrado, limpiar la fecha de cierre
            if (name === 'estado' && value !== 'cerrado') {
                newData.fechaCierre = '';
            }

            return newData;
        });
    };

    const handleTagsChange = (e) => {
        if (!e.target.value) {
            setFormData(prev => ({ ...prev, tags: [] }));
            return;
        }
        setFormData(prev => ({ ...prev, tags: e.target.value.split(',') }));
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const dataToSave = { ...formData };
            if (dataToSave.fechaReporte) {
                dataToSave.fechaReporte = new Date(dataToSave.fechaReporte).toISOString();
            } else {
                delete dataToSave.fechaReporte;
            }

            if (dataToSave.estado === 'cerrado' && dataToSave.fechaCierre) {
                dataToSave.fechaCierre = new Date(dataToSave.fechaCierre).toISOString();
            } else {
                delete dataToSave.fechaCierre;
            }

            if (dataToSave.fechaRespuestaRecibida) {
                dataToSave.fechaRespuestaRecibida = new Date(dataToSave.fechaRespuestaRecibida).toISOString();
            } else {
                delete dataToSave.fechaRespuestaRecibida;
            }

            if (dataToSave.fechaRespuestaEnviada) {
                dataToSave.fechaRespuestaEnviada = new Date(dataToSave.fechaRespuestaEnviada).toISOString();
            } else {
                delete dataToSave.fechaRespuestaEnviada;
            }

            await onSave(dataToSave);
            onClose();
        } catch (err) {
            console.error('Error guardando ticket:', err);
        } finally {
            setSaving(false);
        }
    };

    const isEnProceso = formData.estado === 'en_proceso';

    return (
        <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="4xl" classNames={{
            base: "bg-white dark:bg-default-100 max-h-[90vh]",
            header: "border-b-[1px] border-default-200",
            footer: "border-t-[1px] border-default-200",
        }}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 font-bold text-xl">
                            {ticket ? 'Editar Ticket' : 'Nuevo Ticket'}
                        </ModalHeader>
                        <ModalBody className="py-6 gap-5 overflow-y-auto max-h-[75vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Columna Izquierda: Información General */}
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <Input
                                            label="Nº Ticket"
                                            labelPlacement="outside"
                                            name="ticketNumber"
                                            variant="bordered"
                                            placeholder="Ej. 261456"
                                            value={formData.ticketNumber}
                                            onChange={handleChange}
                                            isRequired
                                            className="w-32"
                                            startContent={<span className="text-xs text-gray-400 mt-0.5">#HT</span>}
                                            classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                        />
                                        <Input
                                            label="Asunto"
                                            labelPlacement="outside"
                                            name="asunto"
                                            variant="bordered"
                                            placeholder="Ej. Error en inicio de sesión"
                                            value={formData.asunto}
                                            onChange={handleChange}
                                            isRequired
                                            className="flex-1"
                                            classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Autocomplete
                                                label="Área solicitante"
                                                labelPlacement="outside"
                                                name="areaSolicitante"
                                                variant="bordered"
                                                placeholder="Ej. SISTEMAS, RRHH..."
                                                inputValue={formData.areaSolicitante}
                                                onInputChange={(value) => setFormData(prev => ({ ...prev, areaSolicitante: value }))}
                                                isRequired
                                                allowsCustomValue
                                                onSelectionChange={(key) => {
                                                    if (key !== null) {
                                                        setFormData(prev => ({ ...prev, areaSolicitante: key }));
                                                    }
                                                }}
                                                classNames={{ base: "w-full", listboxWrapper: "max-h-[320px]" }}
                                                inputProps={{
                                                    classNames: { inputWrapper: "bg-white dark:bg-default-50" }
                                                }}
                                            >
                                                {uniqueAreas.map((area) => (
                                                    <AutocompleteItem key={area} value={area}>
                                                        {area}
                                                    </AutocompleteItem>
                                                ))}
                                            </Autocomplete>
                                        </div>
                                        <div className="flex-1">
                                            <Autocomplete
                                                label="Asignada a"
                                                labelPlacement="outside"
                                                name="asignadoA"
                                                variant="bordered"
                                                placeholder="Ej. Carlos Villarreal"
                                                inputValue={formData.asignadoA}
                                                onInputChange={(value) => setFormData(prev => ({ ...prev, asignadoA: value }))}
                                                allowsCustomValue
                                                onSelectionChange={(key) => {
                                                    if (key !== null) {
                                                        setFormData(prev => ({ ...prev, asignadoA: key }));
                                                    }
                                                }}
                                                classNames={{ base: "w-full", listboxWrapper: "max-h-[320px]" }}
                                                inputProps={{
                                                    classNames: { inputWrapper: "bg-white dark:bg-default-50" }
                                                }}
                                            >
                                                {uniqueAssignees.map((assignee) => (
                                                    <AutocompleteItem key={assignee} value={assignee}>
                                                        {assignee}
                                                    </AutocompleteItem>
                                                ))}
                                            </Autocomplete>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Input
                                            label="Tipo"
                                            labelPlacement="outside"
                                            name="tipo"
                                            variant="bordered"
                                            placeholder="Ej. Requerimiento, Incidente"
                                            value={formData.tipo}
                                            onChange={handleChange}
                                            className="flex-1"
                                            classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                        />
                                        <Input
                                            label="Link (Odoo/referencia)"
                                            labelPlacement="outside"
                                            name="link"
                                            variant="bordered"
                                            placeholder="Ej. https://odoo.example.com/ticket/..."
                                            value={formData.link}
                                            onChange={handleChange}
                                            className="flex-1"
                                            classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Select
                                            label="Grado de Importancia"
                                            labelPlacement="outside"
                                            name="importancia"
                                            variant="bordered"
                                            selectedKeys={[formData.importancia]}
                                            onChange={handleChange}
                                            className="flex-1"
                                        >
                                            <SelectItem key="critico" value="critico">Crítico</SelectItem>
                                            <SelectItem key="Alta (Seguridad)" value="Alta (Seguridad)">Alta (Seguridad)</SelectItem>
                                            <SelectItem key="Alta (Desarrollo)" value="Alta (Desarrollo)">Alta (Desarrollo)</SelectItem>
                                            <SelectItem key="Media (Operativo)" value="Media (Operativo)">Media (Operativo)</SelectItem>
                                            <SelectItem key="Baja" value="Baja">Baja</SelectItem>
                                        </Select>

                                        <Select
                                            label="Estado"
                                            labelPlacement="outside"
                                            name="estado"
                                            variant="bordered"
                                            selectedKeys={[formData.estado]}
                                            onChange={handleChange}
                                            className="flex-1"
                                        >
                                            <SelectItem key="nuevo" value="nuevo">Nuevo</SelectItem>
                                            <SelectItem key="en_proceso" value="en_proceso">En Proceso</SelectItem>
                                            <SelectItem key="cerrado" value="cerrado">Cerrado</SelectItem>
                                        </Select>
                                    </div>

                                    <div>
                                        <Autocomplete
                                            label="Relacionar con otro ticket"
                                            labelPlacement="outside"
                                            placeholder="Buscar por número o asunto..."
                                            variant="bordered"
                                            selectedKey={formData.referenciaTicketId}
                                            onSelectionChange={(key) => {
                                                setFormData(prev => ({ ...prev, referenciaTicketId: key || '' }));
                                            }}
                                            classNames={{ base: "w-full" }}
                                            inputProps={{
                                                classNames: { inputWrapper: "bg-white dark:bg-default-50" }
                                            }}
                                        >
                                            {otherTickets.map((t) => (
                                                <AutocompleteItem key={t.id} textValue={`${t.ticketNumber || t.id} - ${t.asunto}`}>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-mono text-[10px] font-bold text-indigo-600">
                                                            {t.ticketNumber || t.id}
                                                        </span>
                                                        <span className="text-xs text-gray-700 truncate max-w-[280px]">
                                                            {t.asunto}
                                                        </span>
                                                    </div>
                                                </AutocompleteItem>
                                            ))}
                                        </Autocomplete>
                                    </div>

                                    {isEnProceso && (
                                        <div>
                                            <Select
                                                label="Etiquetas Adicionales (Tags)"
                                                labelPlacement="outside"
                                                name="tags"
                                                variant="bordered"
                                                selectionMode="multiple"
                                                selectedKeys={new Set(formData.tags)}
                                                onChange={handleTagsChange}
                                                placeholder="Selecciona etiquetas"
                                                className="w-full"
                                                classNames={{
                                                    trigger: "bg-white dark:bg-default-50"
                                                }}
                                            >
                                                {STANDARD_TAGS.map(tag => (
                                                    <SelectItem key={tag} value={tag}>
                                                        {tag}
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* Columna Derecha: Seguimiento, Cierre y Archivos */}
                                <div className="space-y-4 border-t md:border-t-0 md:border-l border-default-200 pt-5 md:pt-0 md:pl-6 text-left">
                                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">Seguimiento y Cierre</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        {ticket && (
                                            <Input
                                                type="datetime-local"
                                                label="Fecha de Creación"
                                                labelPlacement="outside"
                                                name="fechaReporte"
                                                variant="bordered"
                                                placeholder=" "
                                                value={formData.fechaReporte}
                                                onChange={handleChange}
                                                classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                            />
                                        )}
                                        <Input
                                            type="datetime-local"
                                            label="Fecha de Cierre"
                                            labelPlacement="outside"
                                            name="fechaCierre"
                                            variant="bordered"
                                            placeholder=" "
                                            value={formData.fechaCierre}
                                            onChange={handleChange}
                                            isDisabled={formData.estado !== 'cerrado'}
                                            classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5 py-1">
                                        <span className="text-xs text-gray-500 font-medium mr-2">¿Está Pagado?</span>
                                        <Switch
                                            isSelected={formData.pagado}
                                            onValueChange={(checked) => setFormData(prev => ({ ...prev, pagado: checked }))}
                                            color="success"
                                            size="sm"
                                        >
                                            <span className="text-xs font-semibold text-gray-700">
                                                {formData.pagado ? 'Sí, Pagado' : 'No / Pendiente'}
                                            </span>
                                        </Switch>
                                    </div>

                                    {/* Subsección Seguimiento de Respuestas */}
                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200/60 space-y-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Seguimiento de Respuestas</span>
                                        
                                        {/* 1. Respuesta recibida */}
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">1. Respuesta recibida (de ellos)</span>
                                            <div className="flex gap-3">
                                                <Input
                                                    type="datetime-local"
                                                    label="Fecha"
                                                    labelPlacement="outside"
                                                    name="fechaRespuestaRecibida"
                                                    variant="bordered"
                                                    placeholder=" "
                                                    value={formData.fechaRespuestaRecibida}
                                                    onChange={handleChange}
                                                    className="w-36 shrink-0"
                                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                                />
                                                <Input
                                                    label="Mensaje recibido"
                                                    labelPlacement="outside"
                                                    name="respuestaRecibida"
                                                    variant="bordered"
                                                    placeholder="Ej. Desarrollo inicia lunes..."
                                                    value={formData.respuestaRecibida}
                                                    onChange={handleChange}
                                                    className="flex-1"
                                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                                />
                                            </div>
                                        </div>

                                        {/* 2. Respuesta enviada */}
                                        <div className="space-y-2 pt-2 border-t border-gray-100">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">2. Respuesta enviada (mía)</span>
                                            <div className="flex gap-3">
                                                <Input
                                                    label="Mensaje enviado"
                                                    labelPlacement="outside"
                                                    name="respuestaEnviada"
                                                    variant="bordered"
                                                    placeholder="Ej. Confirmado, gracias..."
                                                    value={formData.respuestaEnviada}
                                                    onChange={handleChange}
                                                    className="flex-1"
                                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección de Cotización */}
                                    <div className="pt-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Cotización Adjunta</span>
                                        {formData.cotizacionPdfData ? (
                                            <div className="flex items-center justify-between bg-emerald-50/40 border border-emerald-200 rounded-xl p-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="text-emerald-600" size={18} />
                                                    <div className="text-left">
                                                        <span className="text-xs font-semibold text-emerald-800 block">Cotización cargada (PDF)</span>
                                                        <span className="text-[10px] text-emerald-600">Guardado en base64</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        color="success"
                                                        variant="flat"
                                                        onPress={() => {
                                                            const newTab = window.open();
                                                            if (newTab) {
                                                                newTab.document.write(
                                                                    `<iframe src="${formData.cotizacionPdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                                                );
                                                            }
                                                        }}
                                                        className="text-xs font-semibold h-8"
                                                    >
                                                        Ver
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        color="danger"
                                                        variant="flat"
                                                        onPress={() => setFormData(prev => ({ ...prev, cotizacionPdfData: '' }))}
                                                        className="text-xs font-semibold h-8"
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center bg-gray-50/40 hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        if (file.type !== 'application/pdf') {
                                                            alert('Solo se admiten archivos PDF');
                                                            return;
                                                        }
                                                        if (file.size > 800 * 1024) {
                                                            alert('El archivo supera el tamaño máximo permitido (máx. 800 KB)');
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                cotizacionPdfData: event.target.result
                                                            }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <Upload className="text-gray-400 mb-1" size={16} />
                                                <span className="text-xs font-semibold text-gray-700">Subir Cotización (PDF)</span>
                                                <span className="text-[10px] text-gray-400">PDF hasta 800 KB</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sección de Observaciones */}
                                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200/60 space-y-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Observaciones y Comentarios</span>
                                        
                                        {/* Historial de observaciones */}
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {formData.observations && formData.observations.length > 0 ? (
                                                formData.observations.map((obs, idx) => (
                                                    <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm text-left">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] font-semibold text-violet-600">
                                                                {obs.date ? new Date(obs.date).toLocaleString('es-ES', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }) : ''}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        observations: prev.observations.filter((_, i) => i !== idx)
                                                                    }));
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Eliminar observación"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-700 whitespace-pre-wrap">{obs.text}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400 italic block">No hay observaciones registradas.</span>
                                            )}
                                        </div>

                                        {/* Campo para agregar observación */}
                                        <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
                                            <Input
                                                label="Nueva observación"
                                                labelPlacement="outside"
                                                placeholder="Ej. Revisado con el cliente..."
                                                variant="bordered"
                                                value={newObservationText}
                                                onChange={(e) => setNewObservationText(e.target.value)}
                                                className="flex-1"
                                                classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                            />
                                            <Button
                                                size="sm"
                                                color="primary"
                                                onPress={() => {
                                                    if (!newObservationText.trim()) return;
                                                    const newObs = {
                                                        text: newObservationText.trim(),
                                                        date: new Date().toISOString()
                                                    };
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        observations: [...(prev.observations || []), newObs]
                                                    }));
                                                    setNewObservationText('');
                                                }}
                                                className="font-semibold"
                                            >
                                                Agregar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="flat" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleSubmit}
                                isDisabled={!formData.asunto || !formData.areaSolicitante || !formData.ticketNumber}
                                isLoading={saving}
                                className="font-semibold shadow-md"
                            >
                                {saving ? 'Guardando...' : 'Guardar Ticket'}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
