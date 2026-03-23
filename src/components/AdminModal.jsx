import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@nextui-org/react';
import { Shield, Key, AlertCircle } from 'lucide-react';
import { useTickets } from '../context/TicketContext';

export const AdminModal = () => {
    const { isAdmin, setIsAdmin } = useTickets();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

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
            // Shake effect could be added here
        }
    };

    const handleDeactivate = () => {
        setIsAdmin(false);
        setIsOpen(false);
        setPassword('');
        setError(false);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
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
                            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center mb-2">
                                <Shield className="text-violet-600" size={24} />
                            </div>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                                Modo Administrador
                            </h2>
                        </ModalHeader>
                        <ModalBody className="py-6">
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
                        </ModalBody>
                        <ModalFooter className="flex gap-3 pb-8">
                            <Button 
                                variant="light" 
                                onPress={onClose}
                                className="font-medium text-gray-500"
                            >
                                Cancelar
                            </Button>
                            {isAdmin ? (
                                <Button 
                                    color="danger" 
                                    variant="flat"
                                    onPress={handleDeactivate}
                                    className="font-bold px-8 shadow-lg shadow-rose-500/20"
                                >
                                    Cerrar Sesión
                                </Button>
                            ) : (
                                <Button 
                                    onPress={handleActivate}
                                    className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold px-8 shadow-lg shadow-violet-500/30"
                                >
                                    Activar
                                </Button>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
