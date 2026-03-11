import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import VisitorLockedModal from './VisitorLockedModal';

interface VisitorContentGuardProps {
    isVisitor: boolean;
    isAllowed: boolean;
    featureName: string;
    children: React.ReactNode;
}

/**
 * Wraps content to guard against visitor access.
 * If visitor + not allowed: shows blurred content with lock overlay.
 * Clicking anywhere on the overlay opens the contact modal.
 */
const VisitorContentGuard: React.FC<VisitorContentGuardProps> = ({
    isVisitor,
    isAllowed,
    featureName,
    children,
}) => {
    const [showModal, setShowModal] = useState(false);

    if (!isVisitor || isAllowed) {
        return <>{children}</>;
    }

    return (
        <>
            <div className="relative h-full w-full overflow-hidden">
                {/* Blurred background content */}
                <div
                    className="h-full w-full pointer-events-none select-none"
                    style={{ filter: 'blur(3px)', opacity: 0.45 }}
                    aria-hidden="true"
                >
                    {children}
                </div>

                {/* Lock overlay */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10 bg-gradient-to-b from-transparent via-white/30 to-white/60"
                    onClick={() => setShowModal(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setShowModal(true)}
                    aria-label={`Desbloquear ${featureName}`}
                >
                    <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/80 backdrop-blur-md border border-emerald-200 shadow-xl max-w-xs text-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-200">
                            <Lock size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-ai-text text-base">{featureName}</p>
                            <p className="text-xs text-ai-subtext mt-1">
                                Disponível para assinantes da plataforma
                            </p>
                        </div>
                        <button
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md"
                            onClick={e => {
                                e.stopPropagation();
                                setShowModal(true);
                            }}
                        >
                            Quero conhecer →
                        </button>
                    </div>
                </div>
            </div>

            <VisitorLockedModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                featureName={featureName}
            />
        </>
    );
};

export default VisitorContentGuard;
