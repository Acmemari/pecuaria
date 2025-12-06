import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Lock, Mail, ArrowRight, Loader2, User, Building2, Phone } from 'lucide-react';
import { formatPhone, validatePhone } from '../lib/utils/phoneMask';

interface LoginPageProps {
    onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onForgotPassword?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onToast, onForgotPassword }) => {
    const { login, signInWithOAuth, signup } = useAuth() as any;
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsSubmitting(true);

        if (isSignup) {
            // Signup flow
            if (password !== confirmPassword) {
                setLoginError('As senhas não coincidem.');
                setIsSubmitting(false);
                return;
            }

            if (password.length < 6) {
                setLoginError('A senha deve ter pelo menos 6 caracteres.');
                setIsSubmitting(false);
                return;
            }

            if (!name.trim()) {
                setLoginError('Por favor, informe seu nome.');
                setIsSubmitting(false);
                return;
            }

            if (!phone.trim()) {
                setLoginError('Por favor, informe seu telefone.');
                setIsSubmitting(false);
                return;
            }

            if (!validatePhone(phone)) {
                setLoginError('Por favor, informe um telefone válido.');
                setIsSubmitting(false);
                return;
            }

            const result = await signup(email, password, name, phone, organizationName);

            if (!result.success) {
                setLoginError(result.error || 'Erro ao criar conta. Tente novamente.');
                setIsSubmitting(false);
                return;
            }
            setIsSubmitting(false);
        } else {
            // Login flow - SIMPLES
            const result = await login(email, password);

            if (!result.success) {
                // DEFINIR ERRO E PARAR
                setLoginError('Email ou senha incorretos. Verifique suas credenciais.');
                setIsSubmitting(false);
                return; // NÃO CONTINUA
            }
            // Login bem sucedido - AuthContext vai redirecionar
            setIsSubmitting(false);
        }
    };

    const handleOAuthLogin = async (provider: 'google') => {
        try {
            setIsOAuthLoading(provider);
            setLoginError('');
            await signInWithOAuth(provider);
        } catch (err: any) {
            setLoginError(`Erro ao fazer login com ${provider}. Tente novamente.`);
            setIsOAuthLoading(null);
        }
    };

    // Real-time password validation
    const passwordsMatch = isSignup ? (confirmPassword === '' || password === confirmPassword) : true;
    const passwordLengthValid = isSignup ? (password === '' || password.length >= 6) : true;

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

                {/* Login/Signup Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-ai-border shadow-sm p-4 sm:p-6 md:p-8">
                    <div className="mb-4 sm:mb-6">
                        <h2 className="text-base sm:text-lg font-semibold">
                            {isSignup ? 'Criar nova conta' : 'Acesse sua conta'}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-ai-subtext mt-1">
                            {isSignup
                                ? 'Preencha os dados abaixo para começar.'
                                : 'Entre com suas credenciais de cliente ou administrador.'}
                        </p>
                    </div>

                    {/* Toggle between Login and Signup */}
                    <div className="mb-4 flex gap-1.5 sm:gap-2 p-1 bg-ai-surface rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignup(false);
                                setLoginError('');
                                setPassword('');
                                setConfirmPassword('');
                                setName('');
                                setPhone('');
                                setOrganizationName('');
                            }}
                            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${!isSignup
                                ? 'bg-ai-text text-white'
                                : 'text-ai-subtext hover:text-ai-text'
                                }`}
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignup(true);
                                setLoginError('');
                                setPassword('');
                                setConfirmPassword('');
                            }}
                            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${isSignup
                                ? 'bg-ai-text text-white'
                                : 'text-ai-subtext hover:text-ai-text'
                                }`}
                        >
                            Cadastrar
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                        {isSignup && (
                            <div>
                                <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">Nome Completo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                        <User size={14} className="sm:w-4 sm:h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        required={isSignup}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border border-ai-border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                    <Mail size={14} className="sm:w-4 sm:h-4" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (loginError) setLoginError('');
                                    }}
                                    className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border border-ai-border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none"
                                    placeholder="exemplo@pecuaria.com"
                                />
                            </div>
                        </div>

                        {isSignup && (
                            <div>
                                <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                    Telefone / WhatsApp
                                    {phone && !validatePhone(phone) && (
                                        <span className="text-rose-500 ml-1">(formato inválido)</span>
                                    )}
                                    {phone && validatePhone(phone) && (
                                        <span className="text-green-600 ml-1">✓</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                        <Phone size={14} className="sm:w-4 sm:h-4" />
                                    </div>
                                    <input
                                        type="tel"
                                        required={isSignup}
                                        value={phone}
                                        onChange={(e) => {
                                            const formatted = formatPhone(e.target.value);
                                            setPhone(formatted);
                                        }}
                                        className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${phone && !validatePhone(phone)
                                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                                            : phone && validatePhone(phone)
                                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                                                : 'border-ai-border focus:border-ai-text'
                                            }`}
                                        placeholder="Ex: (55) 99999-9999"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                Senha
                                {isSignup && password && !passwordLengthValid && (
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
                                        if (loginError) setLoginError('');
                                    }}
                                    className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none ${isSignup && password && !passwordLengthValid
                                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                                        : 'border-ai-border'
                                        }`}
                                    placeholder={isSignup ? "Mínimo 6 caracteres" : "••••••••"}
                                    minLength={isSignup ? 6 : undefined}
                                />
                            </div>
                        </div>

                        {isSignup && (
                            <>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                        Confirmar Senha
                                        {confirmPassword && !passwordsMatch && (
                                            <span className="text-rose-500 ml-1">(senhas não coincidem)</span>
                                        )}
                                        {confirmPassword && passwordsMatch && password && (
                                            <span className="text-green-600 ml-1">✓</span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                            <Lock size={14} className="sm:w-4 sm:h-4" />
                                        </div>
                                        <input
                                            type="password"
                                            required={isSignup}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text transition-all outline-none ${confirmPassword && !passwordsMatch
                                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                                                : confirmPassword && passwordsMatch
                                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                                                    : 'border-ai-border focus:border-ai-text'
                                                }`}
                                            placeholder="Digite a senha novamente"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] sm:text-xs font-medium text-ai-text mb-1.5">
                                        Nome da Organização/Fazenda <span className="text-ai-subtext font-normal">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-ai-subtext">
                                            <Building2 size={14} className="sm:w-4 sm:h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={organizationName}
                                            onChange={(e) => setOrganizationName(e.target.value)}
                                            className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-ai-surface border border-ai-border rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-ai-text focus:border-ai-text transition-all outline-none"
                                            placeholder="Ex: Fazenda Santa Rita"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                isOAuthLoading !== null ||
                                (isSignup && (!passwordsMatch || !passwordLengthValid || !name.trim() || !phone.trim() || !validatePhone(phone)))
                            }
                            className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 bg-ai-text text-white rounded-lg hover:bg-black transition-colors font-medium text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignup ? 'Cadastrar' : 'Entrar'}</span>
                                    <ArrowRight size={14} className="sm:w-4 sm:h-4 ml-2" />
                                </>
                            )}
                        </button>

                        {/* MENSAGEM DE ERRO - SIMPLES E DIRETO */}
                        {loginError && (
                            <p className="text-red-600 text-center text-sm font-medium bg-red-50 border border-red-200 rounded-lg py-3 px-4">
                                {loginError}
                            </p>
                        )}

                        {/* Link Esqueci minha senha - apenas no modo login */}
                        {!isSignup && onForgotPassword && (
                            <div className="text-center mt-2">
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-[10px] sm:text-xs text-ai-subtext hover:text-ai-text font-medium transition-colors"
                                >
                                    Esqueci minha senha
                                </button>
                            </div>
                        )}
                    </form>

                    {!isSignup && (
                        <>
                            {/* OAuth Divider */}
                            <div className="relative my-4 sm:my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-ai-border"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] sm:text-xs">
                                    <span className="px-2 bg-white text-ai-subtext">ou continue com</span>
                                </div>
                            </div>

                            {/* OAuth Buttons */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => handleOAuthLogin('google')}
                                    disabled={isSubmitting || isOAuthLoading !== null}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-white border border-ai-border rounded-lg hover:bg-ai-surface transition-colors font-medium text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed text-ai-text"
                                >
                                    {isOAuthLoading === 'google' ? (
                                        <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span>Continuar com Google</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Hints */}
                <div className="mt-6 sm:mt-8 text-center text-[9px] sm:text-[10px] text-ai-subtext space-y-1">
                    {isSignup ? (
                        <p>Já tem uma conta? <button onClick={() => setIsSignup(false)} className="text-ai-text font-medium hover:underline">Faça login</button></p>
                    ) : (
                        <p>Não tem uma conta? <button onClick={() => setIsSignup(true)} className="text-ai-text font-medium hover:underline">Cadastre-se</button></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
