import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { logger } from '../lib/logger';

const log = logger.withContext({ component: 'AuthCallback' });

const AuthCallback: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (errorParam) {
      log.error('OAuth callback error', new Error(errorDescription || errorParam));
      setError(errorDescription || errorParam || 'Erro durante autenticação.');
    }
  }, []);

  useEffect(() => {
    if (user && !isLoading) {
      log.info('User authenticated on callback, redirecting to app');
      window.location.replace('/');
    }
  }, [user, isLoading]);

  // Fallback: troca PKCE explícita se detectSessionInUrl não funcionar a tempo
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (!code || exchangeAttempted.current) return;

    const fallbackTimer = setTimeout(async () => {
      if (user) return;

      exchangeAttempted.current = true;
      log.info('detectSessionInUrl did not fire in time, attempting manual PKCE exchange');

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          log.error('Manual PKCE exchange failed', new Error(exchangeError.message));

          const msg = exchangeError.message.toLowerCase();
          if (msg.includes('invalid') || msg.includes('expired') || msg.includes('code verifier')) {
            setError('O link de autenticação expirou ou é inválido. Tente fazer login novamente.');
          } else if (msg.includes('already used') || msg.includes('consumed')) {
            setError('Este link de autenticação já foi utilizado. Tente fazer login novamente.');
          } else {
            setError('Falha na autenticação com Google. Tente novamente.');
          }
          return;
        }

        if (data?.session) {
          log.info('Manual PKCE exchange succeeded, waiting for onAuthStateChange');
        }
      } catch (err) {
        log.error('PKCE exchange exception', err instanceof Error ? err : new Error(String(err)));
        setError('Erro inesperado na autenticação. Tente novamente.');
      }
    }, 4000);

    return () => clearTimeout(fallbackTimer);
  }, [user]);

  // Timeout final de segurança (20s total para cobrir: 4s auto + exchange + profile load)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user && !error) {
        log.warn('Auth callback final timeout reached (20s)');
        setError('O processo de autenticação demorou demais. Tente fazer login novamente.');
      }
    }, 20000);

    return () => clearTimeout(timeout);
  }, [user, error]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <div className="text-center max-w-md px-6">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold mb-2">Erro no login</h2>
          <p className="text-sm text-ai-subtext mb-6">{error}</p>
          <button
            onClick={() => window.location.replace('/')}
            className="px-6 py-2.5 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors text-sm font-medium"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" />
        <p className="text-sm text-ai-subtext">Finalizando autenticação...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
