import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { logger } from '../lib/logger';

const log = logger.withContext({ component: 'AuthCallback' });

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (errorParam) {
          log.error('OAuth callback error', new Error(errorDescription || errorParam));
          setError(errorDescription || errorParam || 'Erro durante autenticação.');
          return;
        }

        if (!code) {
          log.error('No code parameter in callback URL', new Error('Missing code'));
          setError('Código de autenticação não encontrado. Tente fazer login novamente.');
          return;
        }

        log.info('Exchanging code for session...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          log.error('Code exchange error', new Error(exchangeError.message));
          setError(exchangeError.message || 'Erro ao finalizar autenticação.');
          return;
        }

        log.info('Code exchanged successfully, redirecting to app');
        window.location.replace('/');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('Unexpected callback error', new Error(message));
        setError('Erro inesperado durante autenticação. Tente novamente.');
      }
    };

    handleCallback();

    const timeout = setTimeout(() => {
      setError('O processo de autenticação demorou demais. Tente fazer login novamente.');
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

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
