/**
 * Hook centralizado de sessão.
 *
 * (1) Aguarda onAuthStateChange (ex: INITIAL_SESSION) resolver antes de permitir fetches.
 * (2) Expõe sessionReady: boolean — use para decidir quando buscar org/fazenda.
 * (3) getAccessToken() sempre chama getSession() de forma assíncrona — token sempre atual.
 *
 * Use este hook (ou useAuth) em componentes que fazem requisições ao backend.
 */
import { useAuth } from '../contexts/AuthContext';

export function useSession() {
  const auth = useAuth();
  return {
    ...auth,
    /** true quando a sessão foi restaurada/estabelecida — seguro para iniciar fetches */
    sessionReady: auth.sessionReady,
    /** Obtém o token JWT atual. Use antes de cada chamada à API Node. */
    getAccessToken: auth.getAccessToken,
  };
}
