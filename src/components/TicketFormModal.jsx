import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Autocomplete, AutocompleteItem } from '@nextui-org/react';

export const TicketFormModal = ({ isOpen, onClose, onSave, ticket, tickets = [] }) => {
    const [formData, setFormData] = useState({
        ticketNumber: '',
        asunto: '',
        areaSolicitante: '',
        importancia: 'Media (Operativo)',
        estado: 'nuevo',
        tags: [],
        link: '',
        fechaReporte: '',
        fechaCierre: ''
    });
    const [saving, setSaving] = useState(false);

    // Extraer áreas únicas de forma inteligente (omitiendo duplicados por mayúsculas/espacios)
    const uniqueAreas = useMemo(() => {
        const areaMap = new Map();
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

    useEffect(() => {
        if (ticket) {
            setFormData({
                ticketNumber: ticket.ticketNumber?.replace('#HT', '') || '',
                asunto: ticket.asunto || '',
                areaSolicitante: ticket.areaSolicitante || '',
                importancia: ticket.importancia || 'Media (Operativo)',
                estado: ticket.estado || 'nuevo',
                tags: ticket.tags || [],
                link: ticket.link || '',
                fechaReporte: ticket.fechaReporte ? ticket.fechaReporte.slice(0, 16) : '',
                fechaCierre: ticket.fechaCierre ? ticket.fechaCierre.slice(0, 16) : ''
            });
        } else {
            setFormData({
                ticketNumber: '',
                asunto: '',
                areaSolicitante: '',
                importancia: 'Media (Operativo)',
                estado: 'nuevo',
                tags: [],
                link: '',
                fechaReporte: '',
                fechaCierre: ''
            });
        }
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
        <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" classNames={{
            base: "bg-white dark:bg-default-100",
            header: "border-b-[1px] border-default-200",
            footer: "border-t-[1px] border-default-200",
        }}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 font-bold text-xl">
                            {ticket ? 'Editar Ticket' : 'Nuevo Ticket'}
                        </ModalHeader>
                        <ModalBody className="py-6 gap-5">
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
                                    className="w-36 mt-6"
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
                                    className="flex-1 mt-6"
                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                />
                            </div>
                            <div className="mt-6">
                                <Autocomplete
                                    label="Área solicitante"
                                    labelPlacement="outside"
                                    name="areaSolicitante"
                                    variant="bordered"
                                    placeholder="Ej. RRHH - Milagros Rubina"
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

                            <div className="flex gap-4 items-end">
                                <Input
                                    label="Link (Odoo/referencia)"
                                    labelPlacement="outside"
                                    name="link"
                                    variant="bordered"
                                    placeholder="Ej. https://odoo.example.com/ticket/..."
                                    value={formData.link}
                                    onChange={handleChange}
                                    className="flex-1 mt-6"
                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                />
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
                                        className="w-48 mt-6"
                                        classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                    />
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Select
                                    label="Grado de Importancia"
                                    labelPlacement="outside"
                                    name="importancia"
                                    variant="bordered"
                                    selectedKeys={[formData.importancia]}
                                    onChange={handleChange}
                                    className="flex-1 mt-6"
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
                                    className="flex-1 mt-6"
                                >
                                    <SelectItem key="nuevo" value="nuevo">Nuevo</SelectItem>
                                    <SelectItem key="en_proceso" value="en_proceso">En Proceso</SelectItem>
                                    <SelectItem key="atendido_parcialmente" value="atendido_parcialmente">Atendido Parcialmente</SelectItem>
                                    <SelectItem key="en_cotizacion" value="en_cotizacion">En Cotización</SelectItem>
                                    <SelectItem key="en_revision" value="en_revision">En Revisión por mí</SelectItem>
                                    <SelectItem key="cerrado" value="cerrado">Cerrado</SelectItem>
                                </Select>
                            </div>

                            <div className="flex gap-4">
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
                                    className="flex-1 mt-6"
                                    classNames={{ inputWrapper: "bg-white dark:bg-default-50" }}
                                />
                                <div className="flex-1"></div>
                            </div>

                            {isEnProceso && (
                                <Select
                                    label="Etiquetas Adicionales (Tags)"
                                    labelPlacement="outside"
                                    name="tags"
                                    variant="bordered"
                                    selectionMode="multiple"
                                    selectedKeys={new Set(formData.tags)}
                                    onChange={handleTagsChange}
                                    placeholder="Selecciona etiquetas"
                                    className="mt-6"
                                >
                                    <SelectItem key="2do nivel" value="2do nivel">2do nivel</SelectItem>
                                    <SelectItem key="3er nivel" value="3er nivel">3er nivel</SelectItem>
                                    <SelectItem key="requiere reunión Teams" value="requiere reunión Teams">Requiere reunión Teams</SelectItem>
                                </Select>
                            )}
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
