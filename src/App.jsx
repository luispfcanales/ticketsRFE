import { useState, useMemo } from 'react';
import { Plus, Search, LayoutDashboard, Lock, FileSpreadsheet, Filter, X, Download } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { TicketProvider, useTickets } from './context/TicketContext';
import { AdminModal } from './components/AdminModal';
import { DragDropContext } from '@hello-pangea/dnd';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { ImportTickets } from './components/ImportTickets';
import { Select, SelectItem, Button } from '@nextui-org/react';
import * as XLSX from 'xlsx';

function AppContent() {
  const { isAdmin, tickets, updateTicketStatus } = useTickets();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, ticket: null });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  const [selectedAreas, setSelectedAreas] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState(new Set());

  // Encontrar todas las áreas y etiquetas únicas presentes
  const uniqueAreas = useMemo(() => {
    const areas = new Set();
    tickets.forEach(t => {
      if (t.areaSolicitante) {
        areas.add(t.areaSolicitante.trim().toUpperCase());
      }
    });
    return Array.from(areas).sort();
  }, [tickets]);

  const uniqueTags = useMemo(() => {
    const tags = new Set();
    tickets.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) tags.add(tag.trim());
        });
      }
    });
    return Array.from(tags).sort();
  }, [tickets]);

  // Filtrar los tickets basados en la consulta y los selectores
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Búsqueda por texto
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query ||
        (t.asunto || '').toLowerCase().includes(query) ||
        (t.ticketNumber || '').toLowerCase().includes(query) ||
        (t.areaSolicitante || '').toLowerCase().includes(query) ||
        (t.assigned_to || t.asignadoA || '').toLowerCase().includes(query);

      // 2. Filtro de área
      let matchesArea = true;
      if (selectedAreas.size > 0) {
        const ticketArea = (t.areaSolicitante || '').trim().toUpperCase();
        matchesArea = selectedAreas.has(ticketArea);
      }

      // 3. Filtro de etiquetas (debe contener todas las etiquetas seleccionadas)
      let matchesTags = true;
      if (selectedTags.size > 0) {
        const ticketTags = t.tags || [];
        matchesTags = Array.from(selectedTags).every(tag => ticketTags.includes(tag));
      }

      return matchesQuery && matchesArea && matchesTags;
    });
  }, [tickets, searchQuery, selectedAreas, selectedTags]);

  const handleOpenModal = (ticket = null) => {
    if (!isAdmin && !ticket) return; // Prevent creating new if not admin
    setModalState({ isOpen: true, ticket });
  };

  const handleCloseModal = (ticket) => {
    if (ticket) {
      setModalState({ isOpen: true, ticket });
    } else {
      setModalState({ isOpen: false, ticket: null });
    }
  };

  const handleExportToExcel = () => {
    if (filteredTickets.length === 0) {
      alert("No hay tickets que coincidan con los filtros para exportar.");
      return;
    }

    const rows = filteredTickets.map(t => {
      const formatDateExcel = (isoStr) => {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      return {
        "Nº Ticket": t.ticketNumber || "",
        "Asunto": t.asunto || "",
        "Área Solicitante": t.areaSolicitante || "",
        "Asignado A": t.asignadoA || "",
        "Tipo": t.tipo || "",
        "Prioridad": t.importancia || "",
        "Estado": t.estado === "nuevo" ? "Nuevo" : t.estado === "en_proceso" ? "En Proceso" : "Cerrado",
        "Etiquetas": (t.tags || []).join(", "),
        "Link": t.link || "",
        "Fecha de Reporte": formatDateExcel(t.fechaReporte),
        "Fecha Respuesta Recibida": formatDateExcel(t.fechaRespuestaRecibida),
        "Respuesta Recibida": t.respuestaRecibida || "",
        "Fecha de Resolución/Cierre": formatDateExcel(t.fechaCierre),
        "Pagado": t.pagado ? "Sí" : "No"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
    XLSX.writeFile(workbook, `tickets_exportados_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Encontrar el último ticket por ID (el más reciente) para mostrar en el badge
  const lastTicket = tickets.length > 0 
    ? [...tickets].sort((a, b) => b.id - a.id)[0] 
    : null;
  const lastTicketNumber = lastTicket ? (lastTicket.ticketNumber || lastTicket.id) : null;

  const onDragStart = (start) => {
    if (isAdmin) {
      setIsDragging(true);
      setDraggingId(start.draggableId);
    }
  };

  const onDragEnd = (result) => {
    setIsDragging(false);
    setDraggingId(null);
    if (!isAdmin) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    updateTicketStatus(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden text-sm">
        <header className="flex flex-col md:flex-row justify-between items-center gap-3 px-4 py-3 bg-white border-b border-gray-200/80 shadow-sm relative z-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-gray-900">
                  ticketRFE
                </h1>
                {lastTicketNumber && (
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-sm">
                    #{lastTicketNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">TI</p>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative w-full md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={14} />
              </span>
              <input
                className="w-full bg-gray-100 border border-gray-200 text-gray-800 rounded-lg py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                placeholder="Buscar ID o asunto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link
              to="/import"
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm active:scale-[0.97] hover:border-gray-300"
            >
              <FileSpreadsheet size={16} className="text-violet-500" />
              Importar
            </Link>
            <Button
              onPress={handleExportToExcel}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm active:scale-[0.97] hover:border-gray-300 h-9"
              startContent={<Download size={16} className="text-emerald-500" />}
            >
              Exportar
            </Button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md active:scale-[0.97] ${
                isAdmin 
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/20" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => isAdmin && handleOpenModal()}
              title={!isAdmin ? "Modo administrador requerido" : "Crear nuevo ticket"}
            >
              {isAdmin ? <Plus size={16} /> : <Lock size={14} />}
              Nuevo
            </button>
          </div>
        </header>

        {/* Barra de Filtros Avanzados */}
        <div className="bg-white border-b border-gray-200/80 px-4 py-2 flex flex-wrap items-center gap-3 relative z-40 shadow-sm">
          <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold select-none mr-2">
            <Filter size={13} className="text-gray-400" />
            <span>Filtros avanzados:</span>
          </div>

          {/* Filtro por Áreas */}
          <div className="w-48">
            <Select
              size="sm"
              placeholder="Todas las Áreas"
              aria-label="Filtrar por Área"
              selectionMode="multiple"
              selectedKeys={selectedAreas}
              onSelectionChange={setSelectedAreas}
              classNames={{
                trigger: "bg-gray-50 border border-gray-200 hover:bg-gray-100 min-h-8 h-8 rounded-lg",
                value: "text-[11px] font-medium"
              }}
            >
              {uniqueAreas.map(area => (
                <SelectItem key={area} value={area} className="text-xs">
                  {area}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Filtro por Etiquetas */}
          <div className="w-48">
            <Select
              size="sm"
              placeholder="Todas las Etiquetas"
              aria-label="Filtrar por Etiquetas"
              selectionMode="multiple"
              selectedKeys={selectedTags}
              onSelectionChange={setSelectedTags}
              classNames={{
                trigger: "bg-gray-50 border border-gray-200 hover:bg-gray-100 min-h-8 h-8 rounded-lg",
                value: "text-[11px] font-medium"
              }}
            >
              {uniqueTags.map(tag => (
                <SelectItem key={tag} value={tag} className="text-xs">
                  {tag}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Limpiar Filtros */}
          {(selectedAreas.size > 0 || selectedTags.size > 0) && (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              onPress={() => {
                setSelectedAreas(new Set());
                setSelectedTags(new Set());
              }}
              className="h-8 rounded-lg text-xs font-semibold px-3"
              startContent={<X size={12} />}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <AdminModal />

        <main className="flex-1 overflow-hidden p-1.5">
          <KanbanBoard
            tickets={filteredTickets}
            modalState={modalState}
            onModalClose={handleCloseModal}
            draggingId={draggingId}
          />
        </main>
      </div>
    </DragDropContext>
  );
}

function App() {
  return (
    <TicketProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/import" element={<ImportTickets />} />
        </Routes>
      </HashRouter>
    </TicketProvider>
  );
}

export default App;
