import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@nextui-org/react';
import { Shield, Key, AlertCircle, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTickets } from '../context/TicketContext';
import { clearAllTickets } from '../api/ticketApi';

export const AdminModal = () => {
    const { isAdmin, setIsAdmin, refreshTickets } = useTickets();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    // States for DB clear flow
    const [clearStep, setClearStep] = useState(0); // 0=hidden, 1=confirm1, 2=confirm2, 3=loading, 4=success, 5=error
    const [clearCount, setClearCount] = useState(0);
    const [clearError, setClearError] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleActivate = () => {
        if (password === 'admin123') {
            setIsAdmin(true);
            setIsOpen(false);
            setPassword('');
            setError(false);
        } else {
            setError(true);
        }
    };

    const handleDeactivate = () => {
        setIsAdmin(false);
        setIsOpen(false);
        setPassword('');
        setError(false);
        resetClear();
    };

    const resetClear = () => {
        setClearStep(0);
        setClearCount(0);
        setClearError('');
    };

    const handleClearConfirm1 = () => setClearStep(2);
    const handleClearConfirm2 = async () => {
        setClearStep(3);
        try {
            const result = await clearAllTickets();
            const deleted = result?.data?.deleted ?? 0;
            setClearCount(deleted);
            setClearStep(4);
            await refreshTickets();
        } catch (err) {
            setClearError(err.message || 'Error desconocido');
            setClearStep(5);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        resetClear();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            backdrop="blur"
            classNames={{
                base: "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 shadow-2xl",
                header: "border-b border-gray-100 dark:border-zinc-800",
                footer: "border-t border-gray-100 dark:border-zinc-800",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 items-center pt-8">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                                clearStep >= 1 ? 'bg-rose-100 dark:bg-rose-500/10' : 'bg-violet-100 dark:bg-violet-500/10'
                            }`}>
                                {clearStep >= 1
                                    ? <Trash2 className="text-rose-600" size={24} />
                                    : <Shield className="text-violet-600" size={24} />
                                }
                            </div>
                            <h2 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r transition-all ${
                                clearStep >= 1 ? 'from-rose-500 to-red-600' : 'from-violet-600 to-indigo-600'
                            }`}>
                                {clearStep === 0 && 'Modo Administrador'}
                                {clearStep === 1 && '¿Borrar toda la base de datos?'}
                                {clearStep === 2 && '¡Confirmación Final!'}
                                {clearStep === 3 && 'Limpiando base de datos...'}
                                {clearStep === 4 && 'Base de datos limpiada'}
                                {clearStep === 5 && 'Error al limpiar'}
                            </h2>
                        </ModalHeader>

                        <ModalBody className="py-6">
                            {/* --- Admin Status View --- */}
                            {clearStep === 0 && (
                                <>
                                    {isAdmin ? (
                                        <div className="text-center space-y-4">
                                            <p className="text-gray-600 dark:text-zinc-400">
                                                El modo administrador ya está <span className="text-emerald-500 font-bold">activado</span>. 
                                                Ahora puedes gestionar tickets y sus estados.
                                            </p>
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                    Acceso total habilitado
                                                </p>
                                            </div>

                                            {/* Danger Zone */}
                                            <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/30 text-left">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="text-rose-500 shrink-0" size={16} />
                                                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Zona de Peligro</span>
                                                </div>
                                                <p className="text-xs text-rose-600/80 mb-3">
                                                    Esta acción eliminará <strong>permanentemente</strong> todos los tickets de la base de datos de Firestore. Es irreversible.
                                                </p>
                                                <Button
                                                    color="danger"
                                                    variant="flat"
                                                    size="sm"
                                                    startContent={<Trash2 size={14} />}
                                                    onPress={() => setClearStep(1)}
                                                    className="font-bold w-full"
                                                >
                                                    Limpiar Base de Datos de Tickets
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-500 text-center mb-2">
                                                Ingresa la clave maestra para habilitar cambios en el tablero.
                                            </p>
                                            <Input
                                                type="password"
                                                label="Contraseña Administrativa"
                                                placeholder="••••••••"
                                                variant="bordered"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setError(false);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                                                startContent={<Key size={18} className="text-gray-400" />}
                                                isInvalid={error}
                                                errorMessage={error ? "Contraseña incorrecta" : ""}
                                                autoFocus
                                                classNames={{
                                                    inputWrapper: "border-gray-200 focus-within:!border-violet-500 transition-all shadow-sm",
                                                }}
                                            />
                                            {error && (
                                                <div className="flex items-center gap-2 text-rose-500 text-xs px-1">
                                                    <AlertCircle size={14} />
                                                    <span>Acceso denegado. Intenta de nuevo.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* --- Confirm Step 1 --- */}
                            {clearStep === 1 && (
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm text-left">
                                        <strong>⚠️ Advertencia:</strong> Estás a punto de borrar <strong>todos los registros de tickets</strong> almacenados en Firestore. Esta operación no se puede deshacer.
                                    </div>
                                    <p className="text-sm text-gray-600">¿Estás completamente seguro de que deseas continuar?</p>
                                </div>
                            )}

                            {/* --- Confirm Step 2 (Final) --- */}
                            {clearStep === 2 && (
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-800 text-sm text-left animate-pulse">
                                        <strong>🚨 Última advertencia:</strong> Esta es tu última oportunidad de cancelar. Si confirmas, <strong>TODOS los tickets serán eliminados permanentemente</strong> de Firestore. No habrá forma de recuperarlos.
                                    </div>
                                    <p className="text-xs text-gray-400">Haz clic en "Confirmar Borrado" solo si estás absolutamente seguro.</p>
                                </div>
                            )}

                            {/* --- Loading --- */}
                            {clearStep === 3 && (
                                <div className="text-center py-6 space-y-4">
                                    <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mx-auto"></div>
                                    <p className="text-sm text-gray-500">Eliminando tickets de Firestore...</p>
                                    <p className="text-xs text-gray-400">Esto puede tardar unos segundos según la cantidad de registros.</p>
                                </div>
                            )}

                            {/* --- Success --- */}
                            {clearStep === 4 && (
                                <div className="text-center space-y-4">
                                    <div className="flex justify-center">
                                        <CheckCircle2 className="text-emerald-500" size={40} />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">
                                        Base de datos limpiada correctamente.
                                    </p>
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium">
                                        Se eliminaron <strong>{clearCount}</strong> ticket{clearCount !== 1 ? 's' : ''} de Firestore.
                                    </div>
                                </div>
                            )}

                            {/* --- Error --- */}
                            {clearStep === 5 && (
                                <div className="text-center space-y-4">
                                    <AlertTriangle className="text-rose-500 mx-auto" size={40} />
                                    <p className="text-sm font-semibold text-rose-700">Error al limpiar la base de datos.</p>
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-mono">
                                        {clearError}
                                    </div>
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter className="flex gap-3 pb-8">
                            {/* --- Default Footer --- */}
                            {clearStep === 0 && (
                                <>
                                    <Button variant="light" onPress={handleClose} className="font-medium text-gray-500">
                                        Cancelar
                                    </Button>
                                    {isAdmin ? (
                                        <Button color="danger" variant="flat" onPress={handleDeactivate} className="font-bold px-8 shadow-lg shadow-rose-500/20">
                                            Cerrar Sesión
                                        </Button>
                                    ) : (
                                        <Button onPress={handleActivate} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold px-8 shadow-lg shadow-violet-500/30">
                                            Activar
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* --- Confirm 1 Footer --- */}
                            {clearStep === 1 && (
                                <>
                                    <Button variant="light" onPress={resetClear} className="font-medium text-gray-500">
                                        Cancelar
                                    </Button>
                                    <Button color="warning" variant="flat" onPress={handleClearConfirm1} className="font-bold shadow-md">
                                        Sí, continuar
                                    </Button>
                                </>
                            )}

                            {/* --- Confirm 2 Footer --- */}
                            {clearStep === 2 && (
                                <>
                                    <Button variant="light" onPress={resetClear} className="font-medium text-gray-500">
                                        Cancelar, no borrar
                                    </Button>
                                    <Button color="danger" onPress={handleClearConfirm2} className="font-bold shadow-md shadow-rose-500/30">
                                        🚨 Confirmar Borrado
                                    </Button>
                                </>
                            )}

                            {/* --- Success / Error Footer --- */}
                            {(clearStep === 4 || clearStep === 5) && (
                                <Button color="primary" className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 w-full" onPress={handleClose}>
                                    Cerrar
                                </Button>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
