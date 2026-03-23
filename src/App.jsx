import { useState } from 'react';
import { Plus, Search, LayoutDashboard } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { TicketProvider, useTickets } from './context/TicketContext';
import { AdminModal } from './components/AdminModal';
import { Lock } from 'lucide-react';

function AppContent() {
  const { isAdmin } = useTickets();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, ticket: null });

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

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-center gap-3 px-4 py-3 bg-white border-b border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              ticketRFE
            </h1>
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
      <AdminModal />

      <main className="flex-1 overflow-hidden p-1.5">
        <KanbanBoard
          searchQuery={searchQuery}
          modalState={modalState}
          onModalClose={handleCloseModal}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <TicketProvider>
      <AppContent />
    </TicketProvider>
  );
}

export default App;
