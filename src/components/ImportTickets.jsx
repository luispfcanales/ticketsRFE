import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Button, Card, CardBody, Select, SelectItem,
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    useDisclosure, Chip, Progress, Input,
} from '@nextui-org/react';
import {
    ArrowLeft, Upload, FileSpreadsheet, Settings, Eye,
    CheckCircle2, AlertTriangle, Link2, Hash, Rocket, XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { importTicketsBatch } from '../api/ticketApi';

// ─── Campos de mapeo ───────────────────────────────────────────────────────────
const TICKET_FIELDS = [
    {
        key: 'ticketRaw',
        label: 'Columna de Ticket',
        required: true,
        description: 'Extrae nº, título y URL del hipervínculo',
        autoExtract: true,
    },
    { key: 'areaSolicitante', label: 'Área',                 required: true,  description: 'Ej. Sistemas, RRHH, etc.' },
    { key: 'asignadoA',       label: 'Asignada a',           required: false, description: 'Ej. Carlos Villarreal' },
    { key: 'importancia',     label: 'Prioridad / Importancia', required: false, description: 'critico, Alta, Media, Baja' },
    { key: 'estado',          label: 'Estado / Etapa',       required: false, description: 'nuevo, en_proceso, etc.' },
    { key: 'fechaReporte',    label: 'Fecha de Reporte',     required: false, description: 'Fecha de creación del ticket' },
    { key: 'tipo',            label: 'Tipo',                 required: false, description: 'Ej. Requerimiento, Incidente' },
    { key: 'fechaRespuesta',  label: 'Fecha de Respuesta',   required: false, description: 'Fecha de respuesta de soporte' },
    { key: 'fechaResolucion', label: 'Fecha de Resolución',  required: false, description: 'Fecha en que se resolvió' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const parseTicketCell = (rawText = '', numLength = 8) => {
    const text = String(rawText).trim();
    if (!text) return { ticketNumber: '', asunto: '' };

    const cleanText = text.replace(/^#/, '');
    const numMatch = cleanText.match(/(HT\w+)/i);
    let fullTicketCode = (numMatch ? numMatch[1] : cleanText.split(' ')[0]) || '';
    const ticketNumber = fullTicketCode.slice(0, numLength).toUpperCase();
    
    let asunto = text;
    const sepIdx = text.indexOf('//');
    if (sepIdx !== -1) {
        asunto = text.slice(sepIdx + 2).trim();
    } else if (fullTicketCode) {
        // Escapar caracteres especiales para RegExp
        const escapedCode = fullTicketCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        try {
            asunto = text.replace(new RegExp(`^#?${escapedCode}\\s*`, 'i'), '').trim();
        } catch (e) {
            console.error("Regex replacement failed for:", fullTicketCode, e);
            if (text.toLowerCase().startsWith(fullTicketCode.toLowerCase())) {
                asunto = text.slice(fullTicketCode.length).trim();
            } else if (text.startsWith('#') && text.slice(1).toLowerCase().startsWith(fullTicketCode.toLowerCase())) {
                asunto = text.slice(fullTicketCode.length + 1).trim();
            }
        }
    }
    return { ticketNumber, asunto };
};

const parseExcelDate = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
            return val.toISOString();
        }
    }
    const str = String(val).trim();
    if (!str) return '';

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d.toISOString();
        } catch {}
    }

    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const hour = match[4] ? parseInt(match[4], 10) : 0;
        const min = match[5] ? parseInt(match[5], 10) : 0;
        const sec = match[6] ? parseInt(match[6], 10) : 0;
        
        const d = new Date(year, month, day, hour, min, sec);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}

    return '';
};

const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '—';
    }
};

const getCellHyperlink = (worksheet, colIndex, rowIndex) => {
    try {
        const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
        const cell = worksheet[cellAddr];
        if (cell?.l?.Target) return cell.l.Target;
    } catch { /* ignore */ }
    return '';
};

// ─── Componente ────────────────────────────────────────────────────────────────
export const ImportTickets = () => {
    const fileInputRef = useRef(null);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const [fileInfo,      setFileInfo]      = useState(null);
    const [workbook,      setWorkbook]      = useState(null);
    const [sheetNames,    setSheetNames]    = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [rawRows,       setRawRows]       = useState([]);
    const [headers,       setHeaders]       = useState([]);
    const [worksheet,     setWorksheet]     = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    const [isDragging,    setIsDragging]    = useState(false);
    const [ticketNumLength, setTicketNumLength] = useState(8);
    const [areaSourceMode, setAreaSourceMode]   = useState('column'); // 'column' | 'fixed'
    const [fixedArea,      setFixedArea]      = useState('SISTEMAS');

    // Import flow
    const [importStep,    setImportStep]    = useState('idle');  // idle | running | done | error
    const [importDone,    setImportDone]    = useState(0);
    const [importTotal,   setImportTotal]   = useState(0);
    const [importErrors,  setImportErrors]  = useState([]);
    const [importCreated, setImportCreated] = useState(0);

    // ── File loading ────────────────────────────────────────────────────────────
    const handleFile = (file) => {
        if (!file) return;
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            alert('Solo se admiten archivos de Excel (.xlsx, .xls)');
            return;
        }
        setFileInfo({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array', cellDates: true, cellStyles: true, cellText: true });
                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                const first = wb.SheetNames[0];
                setSelectedSheet(first);
                loadSheetData(wb, first);
            } catch (err) {
                console.error('Error leyendo Excel:', err);
                alert('Error al leer el archivo Excel.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const loadSheetData = (wb, sheetName) => {
        const ws = wb.Sheets[sheetName];
        setWorksheet(ws);
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length === 0) { setRawRows([]); setHeaders([]); setColumnMapping({}); return; }
        const excelHeaders = data[0].map((h, i) => h ? String(h).trim() : `Columna ${i + 1}`);
        setHeaders(excelHeaders);
        setRawRows(data.slice(1));
        const newMapping = {};
        TICKET_FIELDS.forEach((field) => {
            const matched = excelHeaders.find((h) => {
                const ch = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (field.key === 'ticketRaw')      return ch.includes('ticket') || ch === 'nº ticket';
                if (field.key === 'areaSolicitante') return ch === 'area' || ch.includes('area') || ch.includes('solicitante');
                if (field.key === 'asignadoA')       return ch.includes('asignado') || ch.includes('asignada') || ch.includes('responsable');
                if (field.key === 'importancia')     return ch.includes('importancia') || ch.includes('prioridad') || ch === 'impacto';
                if (field.key === 'estado')          return ch.includes('estado') || ch.includes('etapa');
                if (field.key === 'fechaReporte')    return ch.includes('reportado') || ch.includes('fecha');
                if (field.key === 'tipo')            return ch === 'tipo' || ch.includes('tipo');
                if (field.key === 'fechaRespuesta')  return ch.includes('respuesta');
                if (field.key === 'fechaResolucion') return ch.includes('resolucion') || ch.includes('cierre');
                return false;
            });
            if (matched) newMapping[field.key] = matched;
        });
        setColumnMapping(newMapping);
    };

    const handleSheetChange = (name) => { setSelectedSheet(name); if (workbook) loadSheetData(workbook, name); };
    const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop      = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    const handleMappingChange = (key, val) => setColumnMapping(prev => ({ ...prev, [key]: val }));

    const handleReset = () => {
        setFileInfo(null); setWorkbook(null); setSheetNames([]); setSelectedSheet('');
        setRawRows([]); setHeaders([]); setColumnMapping({}); setWorksheet(null);
        setImportStep('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Mapped tickets ──────────────────────────────────────────────────────────
    const mappedTickets = useMemo(() => {
        if (rawRows.length === 0 || !worksheet) return [];
        const ticketColIdx = columnMapping['ticketRaw'] ? headers.indexOf(columnMapping['ticketRaw']) : -1;
        
        const getRawVal = (row, fieldKey) => {
            if (!row || !Array.isArray(row)) return undefined;
            const col = columnMapping[fieldKey];
            if (!col) return undefined;
            const idx = headers.indexOf(col);
            return idx !== -1 ? row[idx] : undefined;
        };

        const getVal = (row, fieldKey) => {
            if (fieldKey === 'areaSolicitante' && areaSourceMode === 'fixed') {
                return fixedArea;
            }
            const raw = getRawVal(row, fieldKey);
            return raw !== undefined ? String(raw).trim() : '';
        };

        const getDateVal = (row, fieldKey) => {
            const raw = getRawVal(row, fieldKey);
            return parseExcelDate(raw);
        };

        return rawRows.map((row, rowIndex) => {
            if (!row || !Array.isArray(row)) return null;
            let ticketNumber = '', asunto = '', link = '';
            if (ticketColIdx !== -1) {
                const raw = row[ticketColIdx] !== undefined ? String(row[ticketColIdx]) : '';
                ({ ticketNumber, asunto } = parseTicketCell(raw, ticketNumLength));
                link = getCellHyperlink(worksheet, ticketColIdx, rowIndex + 1);
            }
            
            const estado = getVal(row, 'estado');
            const fechaRespuesta = getDateVal(row, 'fechaRespuesta');
            let fechaResolucion = getDateVal(row, 'fechaResolucion');
            
            if (!fechaResolucion && (estado.toLowerCase().includes('resol') || estado.toLowerCase() === 'cerrado')) {
                fechaResolucion = fechaRespuesta;
            }

            return {
                id_temporal:    rowIndex + 1,
                ticketNumber,
                asunto,
                link,
                areaSolicitante: getVal(row, 'areaSolicitante'),
                asignadoA:       getVal(row, 'asignadoA'),
                importancia:     getVal(row, 'importancia'),
                estado,
                fechaReporte:    getDateVal(row, 'fechaReporte'),
                fechaRespuesta,
                fechaResolucion,
                tipo:            getVal(row, 'tipo'),
            };
        }).filter(t => t !== null && (t.ticketNumber || t.asunto));
    }, [rawRows, columnMapping, headers, worksheet, ticketNumLength, areaSourceMode, fixedArea]);

    const isMappingValid = useMemo(
        () => TICKET_FIELDS.filter(f => f.required).every(f => {
            if (f.key === 'areaSolicitante' && areaSourceMode === 'fixed') return !!fixedArea;
            return !!columnMapping[f.key];
        }),
        [columnMapping, areaSourceMode, fixedArea]
    );

    // ── Import action ───────────────────────────────────────────────────────────
    const handleImport = async () => {
        setImportStep('running');
        setImportDone(0);
        setImportTotal(mappedTickets.length);
        setImportErrors([]);
        setImportCreated(0);
        onOpen();

        const result = await importTicketsBatch(mappedTickets, (done, total, errs) => {
            setImportDone(done);
            setImportErrors([...errs]);
        });

        setImportCreated(result.created);
        setImportErrors(result.errors);
        setImportStep(result.errors.length === 0 ? 'done' : 'done_with_errors');
    };

    const progressPct = importTotal > 0 ? Math.round((importDone / importTotal) * 100) : 0;

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden text-sm">
            {/* Header */}
            <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200/80 shadow-sm shrink-0">
                <Link to="/" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-sm">
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileSpreadsheet className="text-violet-600 animate-pulse" size={20} />
                        Importar Tickets desde Excel
                    </h1>
                    <p className="text-xs text-gray-400">Previsualiza y sube los datos a Firestore</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {!fileInfo ? (
                    /* ── Dropzone ── */
                    <div className="flex justify-center items-center h-[350px]">
                        <div
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-full max-w-xl h-full shadow-md
                                ${isDragging ? 'border-violet-500 bg-violet-50 ring-4 ring-violet-500/10 scale-[1.02]' : 'border-gray-300 bg-white hover:border-violet-400 hover:bg-gray-50/50'}`}
                        >
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={e => handleFile(e.target.files[0])} className="hidden" />
                            <div className="p-4 rounded-full bg-violet-100 text-violet-600 mb-4 shadow-inner"><Upload size={32} /></div>
                            <span className="text-sm font-semibold text-gray-700">Arrastra tu archivo de Excel aquí</span>
                            <span className="text-xs text-gray-400 mt-1">Soporta .xlsx y .xls</span>
                            <Button size="sm" className="mt-6 font-semibold shadow-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                                Seleccionar Archivo
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* ── Config column ── */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* File info */}
                            <Card className="border border-gray-200/80 shadow-sm bg-white">
                                <CardBody className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><FileSpreadsheet size={20} /></div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-800 truncate max-w-[150px]">{fileInfo.name}</h3>
                                                <span className="text-[11px] text-gray-400">{fileInfo.size}</span>
                                            </div>
                                        </div>
                                        <Button size="sm" color="danger" variant="flat" onPress={handleReset} className="text-xs font-semibold">
                                            Cambiar
                                        </Button>
                                    </div>
                                    {sheetNames.length > 1 && (
                                        <div className="mt-4">
                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Hoja</label>
                                            <Select size="sm" variant="bordered" selectedKeys={[selectedSheet]} onChange={e => handleSheetChange(e.target.value)}>
                                                {sheetNames.map(n => <SelectItem key={n}>{n}</SelectItem>)}
                                            </Select>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            {/* Column mapping */}
                            <Card className="border border-gray-200/80 shadow-sm bg-white">
                                <CardBody className="p-4">
                                    <h3 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                                        <Settings className="text-violet-600" size={16} /> Mapear Columnas
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mb-4">
                                        El nº, asunto y URL se extraen solos del campo Ticket.
                                    </p>

                                    {/* Configuración longitud número de ticket */}
                                    <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-3 mb-4 text-left">
                                        <span className="text-xs font-semibold text-gray-700">
                                            Longitud del número de ticket
                                        </span>
                                        <Input
                                            size="sm"
                                            type="number"
                                            variant="bordered"
                                            min={1}
                                            max={30}
                                            value={ticketNumLength}
                                            onChange={e => setTicketNumLength(Number(e.target.value) || 8)}
                                            classNames={{ inputWrapper: "bg-white" }}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        {TICKET_FIELDS.map(field => {
                                            const isArea = field.key === 'areaSolicitante';
                                            return (
                                                <div key={field.key} className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-baseline gap-1">
                                                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                                            {field.required && <span className="text-red-500">*</span>}
                                                            {field.label}
                                                            {field.autoExtract && (
                                                                <Chip size="sm" color="secondary" variant="flat" className="text-[9px] h-4 px-1">auto</Chip>
                                                            )}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 shrink-0">{field.description}</span>
                                                    </div>

                                                    {isArea && (
                                                        <div className="flex gap-2 mb-1">
                                                            <Button
                                                                size="xs"
                                                                variant={areaSourceMode === 'column' ? 'solid' : 'bordered'}
                                                                color={areaSourceMode === 'column' ? 'secondary' : 'default'}
                                                                onPress={() => setAreaSourceMode('column')}
                                                                className="flex-1 text-[11px] h-7 min-w-0"
                                                            >
                                                                Columna Excel
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                variant={areaSourceMode === 'fixed' ? 'solid' : 'bordered'}
                                                                color={areaSourceMode === 'fixed' ? 'secondary' : 'default'}
                                                                onPress={() => setAreaSourceMode('fixed')}
                                                                className="flex-1 text-[11px] h-7 min-w-0"
                                                            >
                                                                Valor Fijo
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {isArea && areaSourceMode === 'fixed' ? (
                                                        <Select
                                                            size="sm" variant="bordered" placeholder="-- Seleccionar Área --"
                                                            selectedKeys={[fixedArea]}
                                                            onChange={e => setFixedArea(e.target.value)}
                                                        >
                                                            <SelectItem key="SISTEMAS">SISTEMAS</SelectItem>
                                                            <SelectItem key="RRHH">RRHH</SelectItem>
                                                            <SelectItem key="CONTA">CONTA</SelectItem>
                                                            <SelectItem key="LOG">LOG</SelectItem>
                                                            <SelectItem key="TSB">TSB</SelectItem>
                                                        </Select>
                                                    ) : (
                                                        <Select
                                                            size="sm" variant="bordered" placeholder="-- Elegir Columna --"
                                                            selectedKeys={columnMapping[field.key] ? [columnMapping[field.key]] : []}
                                                            onChange={e => handleMappingChange(field.key, e.target.value)}
                                                        >
                                                            {headers.map(h => <SelectItem key={h}>{h}</SelectItem>)}
                                                        </Select>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!isMappingValid && (
                                        <div className="mt-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex gap-2 items-start">
                                            <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                                            <span>Mapea los campos obligatorios (*) para continuar.</span>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        {/* ── Preview column ── */}
                        <div className="lg:col-span-2">
                            <Card className="border border-gray-200/80 shadow-sm bg-white">
                                <CardBody className="p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                <Eye className="text-violet-600" size={16} /> Previsualización
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                Tickets detectados: <strong className="text-gray-700">{mappedTickets.length}</strong>
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            isDisabled={!isMappingValid || mappedTickets.length === 0}
                                            onPress={handleImport}
                                            startContent={<Rocket size={14} />}
                                            className="font-bold shadow-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                                        >
                                            Importar {mappedTickets.length > 0 ? `(${mappedTickets.length})` : ''}
                                        </Button>
                                    </div>

                                    {mappedTickets.length > 0 ? (
                                        <div className="overflow-x-auto max-h-[500px] border border-gray-200 rounded-lg">
                                            <Table aria-label="Preview" classNames={{ base: 'min-w-full', table: 'min-w-full' }}>
                                                <TableHeader>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px] w-[110px]">
                                                        <Hash size={10} className="inline mr-0.5" />Nº Ticket
                                                    </TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Asunto</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px] w-[40px]">
                                                        <Link2 size={10} className="inline" />
                                                    </TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Área</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Asignado</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Tipo</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Reportado</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Respuesta</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Resolución</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Prioridad</TableColumn>
                                                    <TableColumn className="font-bold text-gray-700 bg-gray-50 text-[11px]">Estado</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {mappedTickets.slice(0, 10).map(ticket => (
                                                        <TableRow key={ticket.id_temporal} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                            <TableCell className="font-mono text-[11px] text-indigo-600 font-bold">{ticket.ticketNumber || '—'}</TableCell>
                                                            <TableCell className="max-w-[220px] text-[11px] text-gray-800">
                                                                <span className="line-clamp-2">{ticket.asunto || '(Vacío)'}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {ticket.link
                                                                    ? <Chip size="sm" color="success" variant="flat" className="text-[9px] h-4" title={ticket.link}>✓</Chip>
                                                                    : <Chip size="sm" color="default" variant="flat" className="text-[9px] h-4">—</Chip>
                                                                }
                                                            </TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{ticket.areaSolicitante || '—'}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{ticket.asignadoA || '—'}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{ticket.tipo || '—'}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{formatDate(ticket.fechaReporte)}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{formatDate(ticket.fechaRespuesta)}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{formatDate(ticket.fechaResolucion)}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{ticket.importancia || '—'}</TableCell>
                                                            <TableCell className="text-[11px] text-gray-500">{ticket.estado || '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {mappedTickets.length > 10 && (
                                                <div className="text-center py-2.5 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400">
                                                    Mostrando 10 de {mappedTickets.length} filas.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-lg bg-gray-50/50 text-gray-400">
                                            <AlertTriangle className="mb-2 text-gray-300" size={24} />
                                            <span className="text-xs">Mapea la columna de Ticket para ver la previsualización.</span>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Import progress modal ── */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={importStep !== 'running'} size="lg" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                                    {importStep === 'running' && <Rocket className="text-violet-600 animate-bounce" size={20} />}
                                    {importStep === 'done' && <CheckCircle2 className="text-emerald-500" size={20} />}
                                    {importStep === 'done_with_errors' && <AlertTriangle className="text-amber-500" size={20} />}
                                    {importStep === 'running'
                                        ? `Importando tickets... (${importDone}/${importTotal})`
                                        : importStep === 'done'
                                        ? 'Importación completada'
                                        : 'Importación con errores'}
                                </div>
                            </ModalHeader>

                            <ModalBody className="py-5 space-y-4">
                                {/* Progress bar */}
                                <Progress
                                    value={progressPct}
                                    color={importStep === 'done' ? 'success' : importStep === 'done_with_errors' ? 'warning' : 'secondary'}
                                    className="w-full"
                                    label={importStep === 'running' ? `${progressPct}%` : undefined}
                                    showValueLabel
                                />

                                {/* Summary */}
                                {importStep !== 'running' && (
                                    <div className={`p-3 rounded-xl border text-sm ${importStep === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                        <strong>{importCreated}</strong> ticket{importCreated !== 1 ? 's' : ''} creado{importCreated !== 1 ? 's' : ''} correctamente.
                                        {importErrors.length > 0 && (
                                            <span> <strong>{importErrors.length}</strong> fallo{importErrors.length !== 1 ? 's' : ''}.</span>
                                        )}
                                    </div>
                                )}

                                {/* Error list */}
                                {importErrors.length > 0 && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 max-h-[200px] overflow-y-auto">
                                        <p className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1">
                                            <XCircle size={12} /> Errores ({importErrors.length})
                                        </p>
                                        <ul className="space-y-1">
                                            {importErrors.map((e, i) => (
                                                <li key={i} className="text-[11px] font-mono text-rose-600 leading-tight">{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importStep === 'running' && (
                                    <p className="text-xs text-gray-400 text-center">No cierres esta ventana mientras se importa.</p>
                                )}
                            </ModalBody>

                            <ModalFooter className="border-t border-gray-100 pt-3">
                                {importStep !== 'running' && (
                                    <Button
                                        color="primary"
                                        onPress={onClose}
                                        className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                                    >
                                        {importStep === 'done' ? '¡Listo! Cerrar' : 'Cerrar'}
                                    </Button>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
