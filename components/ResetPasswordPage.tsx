import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface ResetPasswordPageProps {
    onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onSuccess: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onToast, onSuccess }) => {
    const { updatePassword } = useAuth() as any;
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    // Verificar se há token na URL (hash fragment ou query string)
    useEffect(() => {
        // Verificar hash fragment (Supabase usa #access_token=... ou #error=...)
        const hash = window.location.hash;
        const hasAccessToken = hash.includes('access_token=');
        const hasTypeRecovery = hash.includes('type=recovery') || hash.includes('type%3Drecovery');
        
        // Verificar se há erros no hash fragment
        const hasError = hash.includes('error=');
        let errorMessage = '';
        
        if (hasError) {
            // Extrair informações do erro do hash
            const errorMatch = hash.match(/error=([^&]+)/);
            const errorCodeMatch = hash.match(/error_code=([^&]+)/);
            const errorDescMatch = hash.match(/error_description=([^&]+)/);
            
            const errorCode = errorCodeMatch ? decodeURIComponent(errorCodeMatch[1]) : '';
            const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : '';
            
            // Mapear erros comuns para mensagens amigáveis
            if (errorCode === 'otp_expired' || errorDesc.includes('expired') || errorDesc.includes('expirado')) {
                errorMessage = 'O link de recuperação expirou. Por favor, solicite um novo link.';
            } else if (errorCode === 'access_denied' || errorDesc.includes('invalid') || errorDesc.includes('inválido')) {
                errorMessage = 'Link de recuperação inválido. Por favor, solicite um novo link.';
            } else {
                errorMessage = 'Erro ao processar o link de recuperação. Por favor, solicite um novo link.';
            }
        }
        
        // Verificar query string também (fallback)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');

        // Se tiver access_token no hash OU token na query string, considerar válido
        // O Supabase processará o token automaticamente
        if ((hasAccessToken && hasTypeRecovery) || (token && type === 'recovery')) {
            setHasToken(true);
            // Limpar hash fragment após detectar (opcional, mas mantém URL limpa)
            // Aguardar um pouco para o Supabase processar primeiro
            setTimeout(() => {
                if (window.location.hash && !hasError) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }, 1000);
        } else if (hasError) {
            // Se houver erro, mostrar mensagem de erro mas ainda permitir que a página seja exibida
            setError(errorMessage);
            setHasToken(false);
        } else {
            setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
            setHasToken(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validações
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await updatePassword(password);

            if (!result.success) {
                setError(result.error || 'Erro ao redefinir senha. Tente novamente.');
                setIsSubmitting(false);
                return;
            }

            // Sucesso
            setIsSuccess(true);
            setIsSubmitting(false);
            if (onToast) {
                onToast('Senha redefinida com sucesso!', 'success');
            }

            // Redirecionar após 2 segundos
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'Erro inesperado. Tente novamente.');
            setIsSubmitting(false);
        }
    };

    // Se não tiver token válido, mostrar mensagem de erro mas ainda exibir a página
    if (!hasToken) {
        return (
            <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans overflow-y-auto">
                <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 pb-12">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <div className="p-2 sm:p-3 rounded-xl bg-ai-text text-white mb-3 sm:mb-4">
                            <BrainCircuit size={24} className="sm:w-8 sm:h-8" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PecuarIA</h1>
                        <p className="text-ai-subtext text-xs sm:text-sm mt-1 sm:mt-2">Gestão de precisão para sua fazenda</p>
                    </div>

                    {/* Error Card */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-ai-border shadow-sm p-4 sm:p-6 md:p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-base sm:text-lg font-semibold mb-2">Link inválido ou expirado</h2>
                            <p className="text-[10px] sm:text-xs text-ai-subtext mb-6">
                                {error || 'Este link de recuperação é inválido ou expirou. Por favor, solicite um novo link de recuperação.'}
                            </p>
                            <button
                                onClick={onSuccess}
                                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-ai-text text-white rounded-lg hover:bg-black transition-colors font-medium text-xs sm:text-sm"
                            >
                                <span>Voltar ao login</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans overflow-y-auto">
                <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 pb-12">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <div className="p-2 sm:p-3 rounded-xl bg-ai-text text-white mb-3 sm:mb-4">
                            <BrainCircuit size={24} className="sm:w-8 sm:h-8" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PecuarIA</h1>
                        <p className="text-ai-subtext text-xs sm:text-sm mt-1 sm:mt-2">Gestão de precisão para sua fazenda</p>
                    </div>

                    {/* Success Card */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-ai-border shadow-sm p-4 sm:p-6 md:p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <h2 className="text-base sm:text-lg font-semibold mb-2">Senha redefinida!</h2>
                            <p className="text-[10px] sm:text-xs text-ai-subtext mb-6">
                                Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-ai-bg text-ai-text font-sans overflow-y-auto">
            <div className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 pb-12">

                {/* Logo Section */}
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                    <div className="p-2 sm:p-3 rounded-xl bg-ai-text text-white mb-3 sm:mb-4">
                        <BrainCircuit size={24} className="sm:w-8 sm:h-8" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PecuarIA</h1>
                    <p className="text-ai-subtext text-xs sm:text-sm mt-1 sm:mt-2">Gestão de precisão para sua fazenda</p>
                </div>

                {/* Reset Password Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-ai-border shadow-sm p-4 sm:p-6 md:p-8">
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-base sm:text-lg font-semibold">Redefinir senha</h2>
                        <p className="text-[10px] sm:text-xs text-ai-subtext mt-1">
                            Digite sua nova senha abaixo. A senha deve ter no mínimo 6 caracteres.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                Nova Senha
                                {password && password.length < 6 && (
                                    <span className="text-rose-500 ml-1">(mínimo 6 caracteres)</span>
                                )}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                    <Lock size={14} className="sm:w-4 sm:h-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${password && password.length < 6
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                                        : 'border-ai-border focus:border-ai-text'
                                        }`}
                                    placeholder="Mínimo 6 caracteres"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                Confirmar Senha
                                {confirmPassword && password !== confirmPassword && (
                                    <span className="text-rose-500 ml-1">(senhas não coincidem)</span>
                                )}
                                {confirmPassword && password === confirmPassword && password.length >= 6 && (
                                    <span className="text-green-600 ml-1">✓</span>
                                )}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                    <Lock size={14} className="sm:w-4 sm:h-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${confirmPassword && password !== confirmPassword
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                                        : confirmPassword && password === confirmPassword && password.length >= 6
                                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                                            : 'border-ai-border focus:border-ai-text'
                                        }`}
                                    placeholder="Digite a senha novamente"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-600 text-center text-sm font-medium bg-red-50 border border-red-200 rounded-lg py-3 px-4">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || password.length < 6 || password !== confirmPassword}
                            className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 bg-ai-text text-white rounded-lg hover:bg-black transition-colors font-medium text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                            ) : (
                                <>
                                    <span>Redefinir senha</span>
                                    <ArrowRight size={14} className="sm:w-4 sm:h-4 ml-2" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;

