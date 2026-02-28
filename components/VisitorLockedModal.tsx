import React, { useState } from 'react';
import { Lock, X, MessageCircle, CheckCircle2, ChevronRight } from 'lucide-react';

interface VisitorLockedModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
}

const VisitorLockedModal: React.FC<VisitorLockedModalProps> = ({ isOpen, onClose, featureName }) => {
    const [submitted, setSubmitted] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    if (!isOpen) return null;

    const handleWhatsApp = () => {
        const message = encodeURIComponent(
            `Olá! Sou visitante do pecuarIA e gostaria de conhecer a ferramenta "${featureName ?? 'Plataforma'}" e saber como contratar. Poderia me ajudar?`,
        );
        window.open(`https://wa.me/5544991333278?text=${message}`, '_blank'); // TODO: substituir pelo número real da equipe Inttegra
        setSubmitted(true);
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        // Abre WhatsApp com os dados preenchidos
        const message = encodeURIComponent(
            `Olá! Meu nome é ${name}. Vi o pecuarIA como visitante e quero saber mais sobre "${featureName ?? 'a plataforma'}". Meu telefone é ${phone}.`,
        );
        window.open(`https://wa.me/5544991333278?text=${message}`, '_blank');
        setSubmitted(true);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header gradient */}
                <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 p-6 pb-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                            <Lock size={28} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                                Funcionalidade exclusiva
                            </p>
                            <h2 className="text-xl font-bold">
                                {featureName ? `"${featureName}"` : 'Esta ferramenta'} está disponível para assinantes
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 -mt-3">
                    {submitted ? (
                        <div className="flex flex-col items-center text-center gap-3 py-4">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                            <p className="font-bold text-ai-text text-lg">Perfeito! 🎉</p>
                            <p className="text-sm text-ai-subtext">
                                Nossa equipe entrará em contato em breve para apresentar a plataforma completa.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-2 px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                Fechar
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-ai-subtext text-center mb-5">
                                Quer conhecer como a equipe <strong className="text-ai-text">Inttegra</strong> pode transformar
                                a gestão da sua pecuária com ferramentas como essa?
                            </p>

                            <form onSubmit={handleSubmitForm} className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-ai-subtext block mb-1">Seu nome</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Ex: João Silva"
                                        required
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-ai-border bg-ai-surface2 text-ai-text focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-ai-subtext block mb-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="(11) 9 9999-9999"
                                        required
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-ai-border bg-ai-surface2 text-ai-text focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-md shadow-green-200"
                                >
                                    <MessageCircle size={16} />
                                    Quero receber contato da equipe Inttegra
                                    <ChevronRight size={14} />
                                </button>
                            </form>

                            <div className="flex items-center gap-3 mt-4">
                                <div className="flex-1 h-px bg-ai-border" />
                                <span className="text-xs text-ai-subtext">ou</span>
                                <div className="flex-1 h-px bg-ai-border" />
                            </div>

                            <button
                                onClick={handleWhatsApp}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-400 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Falar pelo WhatsApp agora
                            </button>

                            <button
                                onClick={onClose}
                                className="mt-2 w-full py-2 text-xs text-ai-subtext hover:text-ai-text transition-colors"
                            >
                                Agora não, continuar explorando
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisitorLockedModal;
