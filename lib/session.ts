/**
 * Helpers centralizados para sessão Supabase.
 * Sempre use getAccessToken() antes de chamadas à API Node — nunca armazene
 * o token em estado, pois pode ficar desatualizado após refresh.
 */
import { supabase } from './supabase';

/** Obtém o access_token atual de forma assíncrona (sempre fresco). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

/** Retorna headers prontos para requisições autenticadas à API. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
