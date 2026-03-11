import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, AuthContextType, Plan } from '../types';
import { supabase } from '../lib/supabase';
import { loadUserProfile } from '../lib/auth/loadUserProfile';
import { createUserProfileIfMissing } from '../lib/auth/createProfile';
import { checkPermission as checkPermissionUtil, checkLimit as checkLimitUtil } from '../lib/auth/permissions';
import { logger } from '../lib/logger';

const log = logger.withContext({ component: 'AuthContext' });

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Builds a minimal User object from Supabase session metadata.
 * Used as an immediate fallback while the full profile loads from the DB.
 */
function buildFallbackUser(sessionUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): User {
  const meta = sessionUser.user_metadata ?? {};
  const validQualifications = ['visitante', 'cliente', 'analista'] as const;
  const rawQual = typeof meta.qualification === 'string' ? meta.qualification.trim() : '';
  const isAdmin = meta.role === 'admin';
  let qualification: 'visitante' | 'cliente' | 'analista' | undefined;
  if (validQualifications.includes(rawQual as (typeof validQualifications)[number])) {
    // Admins must never be treated as 'visitante'
    qualification = (isAdmin && rawQual === 'visitante')
      ? 'analista'
      : (rawQual as 'visitante' | 'cliente' | 'analista');
  } else {
    qualification = isAdmin ? 'analista' : undefined;
  }
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    name: (meta.name as string) || (meta.full_name as string) || 'Usuário',
    role: (meta.role === 'admin' ? 'admin' : 'client') as 'admin' | 'client',
    plan: (['basic', 'pro', 'enterprise'].includes(meta.plan as string)
      ? (meta.plan as 'basic' | 'pro' | 'enterprise')
      : 'basic'),
    avatar: (meta.avatar as string) || (sessionUser.email?.[0].toUpperCase() ?? 'U'),
    status: 'active',
    qualification,
  };
}

/**
 * Loads the user profile with progressive retry using exponential-style delays.
 * On first failure, attempts to create the profile (handles new signups where
 * the DB trigger hasn't fired yet). Total max wait: ~5.6 seconds.
 */
async function loadProfileWithRetry(userId: string): Promise<User | null> {
  // Progressive delays: immediate, 300ms, 700ms, 1.5s, 3s
  const delays = [0, 300, 700, 1500, 3000];
  let creationAttempted = false;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await new Promise(r => setTimeout(r, delays[i]));
    }

    const profile = await loadUserProfile(userId, 1, 0);
    if (profile) return profile;

    // On first miss, try to create the profile (new user / trigger delay)
    if (!creationAttempted) {
      creationAttempted = true;
      log.info('Profile not found on first attempt, triggering creation', { userId });
      await createUserProfileIfMissing(userId);
    }
  }

  log.warn('Profile not found after all retry attempts', { userId });
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  /**
   * Guards against concurrent profile loads.
   * Set to true while a profile is being fetched to prevent duplicate requests.
   */
  const profileLoadingRef = useRef(false);

  /**
   * Signals that login() is actively managing the post-login profile load.
   * When true, the SIGNED_IN handler in onAuthStateChange will defer to login().
   */
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    // Hard safety net: if something goes wrong, unblock the UI after 8 seconds
    const safetyTimeout = setTimeout(() => {
      log.warn('Auth initialization timeout - forcing isLoading = false');
      setIsLoading(false);
    }, 8000);

    /**
     * Single source of truth for auth state.
     * We rely on onAuthStateChange instead of calling getSession() separately
     * to avoid duplicated logic and race conditions.
     *
     * Event flow on page load with existing session:
     *   INITIAL_SESSION → (profile loads in background)
     *
     * Event flow on new login:
     *   SIGNED_IN → (handled by login() for email/password, or here for OAuth)
     *
     * Event flow on password reset link:
     *   PASSWORD_RECOVERY → show reset form
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      log.debug(`Auth state changed: ${event}`, { userId: session?.user?.id });

      // --- PASSWORD RECOVERY ---
      if (event === 'PASSWORD_RECOVERY') {
        log.info('Password recovery token detected, showing reset password page');
        setIsPasswordRecovery(true);
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        return;
      }

      // --- INITIAL SESSION (page load) ---
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          clearTimeout(safetyTimeout);
          // Load full profile first, use fallback ONLY if it fails
          try {
            const profile = await loadUserProfile(session.user.id);
            const finalUser = profile ?? buildFallbackUser(session.user);
            setUser(finalUser);
            // Sync qualification to Supabase metadata for future fallback accuracy
            if (profile?.qualification) {
              supabase.auth.updateUser({ data: { qualification: profile.qualification } }).catch(() => { });
            }
          } catch (err: unknown) {
            log.error('Error loading user profile', err instanceof Error ? err : new Error(String(err)));
            setUser(buildFallbackUser(session.user));
          }
          setIsLoading(false);
        } else {
          // Check if URL has a PKCE code — the SDK (detectSessionInUrl: true)
          // will exchange it and fire SIGNED_IN. Don't show login yet, just wait.
          const urlHasCode = new URLSearchParams(window.location.search).has('code');
          if (urlHasCode) {
            log.info('PKCE code in URL — waiting for SDK to exchange...');
            // Do NOT clean the URL here — the SDK needs it for PKCE exchange.
            // It will be cleaned after SIGNED_IN fires successfully.
            // Keep isLoading=true — the safety timeout (8s) will unblock if exchange fails
          } else {
            setUser(null);
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          }
        }
        return;
      }

      // --- SIGNED IN ---
      if (event === 'SIGNED_IN' && session?.user) {
        // Check for password recovery flow — do NOT auto-login
        // IMPORTANT: Only check for 'type=recovery', NOT for 'access_token='.
        // Checking 'access_token=' would incorrectly block OAuth callbacks (Google, etc.)
        const hash = window.location.hash;
        const pathname = window.location.pathname;
        const isResetPasswordPath = pathname.includes('reset-password');
        const isRecoveryToken = hash.includes('type=recovery') || hash.includes('type%3Drecovery');

        if (isResetPasswordPath || isRecoveryToken) {
          log.info('Recovery session detected, skipping auto-login');
          clearTimeout(safetyTimeout);
          setIsLoading(false);
          return;
        }

        // If login() is already handling this SIGNED_IN (email/password flow),
        // defer to it to avoid duplicate profile loads and race conditions.
        if (loginInProgressRef.current) {
          log.debug('login() in progress — SIGNED_IN handler deferring');
          return;
        }

        // OAuth or other sign-in flows (e.g. Google) are handled here
        log.info('SIGNED_IN via OAuth — loading profile');

        if (!profileLoadingRef.current) {
          profileLoadingRef.current = true;
          clearTimeout(safetyTimeout);
          // Clean any OAuth code/state from the URL now that exchange succeeded
          if (window.location.search.includes('code=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          try {
            // Load full profile first, fallback only if it fails
            const profile = await loadProfileWithRetry(session.user.id);
            const finalUser = profile ?? buildFallbackUser(session.user);
            setUser(finalUser);
            if (profile?.qualification) {
              supabase.auth.updateUser({ data: { qualification: profile.qualification } }).catch(() => { });
            }
          } catch {
            setUser(buildFallbackUser(session.user));
          } finally {
            profileLoadingRef.current = false;
            setIsLoading(false);
          }
        }
        return;
      }
      // --- SIGNED OUT ---
      if (event === 'SIGNED_OUT') {
        setUser(null);
        profileLoadingRef.current = false;
        loginInProgressRef.current = false;
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        // Clear session-specific localStorage (covers external sign-outs, expired sessions)
        try {
          localStorage.removeItem('hierarchySelection.v1');
          localStorage.removeItem('agro-farms');
          localStorage.removeItem('selectedAnalystId');
          localStorage.removeItem('selectedClientId');
          localStorage.removeItem('selectedFarm');
          localStorage.removeItem('selectedFarmId');
        } catch {
          // Ignore storage errors
        }
        return;
      }

      // --- TOKEN REFRESHED ---
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const userProfile = await loadUserProfile(session.user.id);
          if (userProfile) {
            setUser(userProfile);
          }
        } catch (err: unknown) {
          log.error('Error refreshing token profile', err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Email/password login.
   *
   * Design decisions:
   * - Sets loginInProgressRef so the SIGNED_IN handler doesn't duplicate work.
   * - Immediately renders app with fallback user (no waiting for profile).
   * - Loads full profile in background so the UI feels instant.
   * - Does NOT call setIsLoading(true) to avoid unmounting LoginPage.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      loginInProgressRef.current = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          log.error('Login error', new Error(error.message));
          const errorMsg = error.message.toLowerCase();
          let errorMessage = 'Erro ao realizar login.';

          if (errorMsg.includes('invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
          } else if (errorMsg.includes('email not confirmed') || errorMsg.includes('email_not_confirmed')) {
            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
          } else if (errorMsg.includes('user not found') || errorMsg.includes('user_not_found')) {
            errorMessage = 'Email não encontrado. Verifique se o email está correto.';
          } else if (errorMsg.includes('invalid email')) {
            errorMessage = 'Email inválido. Verifique o formato do email.';
          } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
            errorMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
          }

          return { success: false, error: errorMessage };
        }

        if (data.user) {
          log.info('Login successful', { userId: data.user.id });

          // Load full profile first, fallback only if it fails
          if (!profileLoadingRef.current) {
            profileLoadingRef.current = true;
            try {
              const profile = await loadProfileWithRetry(data.user.id);
              const finalUser = profile ?? buildFallbackUser(data.user);
              setUser(finalUser);
              if (profile?.qualification) {
                supabase.auth.updateUser({ data: { qualification: profile.qualification } }).catch(() => { });
              }
            } catch {
              setUser(buildFallbackUser(data.user));
            } finally {
              profileLoadingRef.current = false;
            }
          } else {
            setUser(buildFallbackUser(data.user));
          }
          setIsLoading(false);

          return { success: true };
        }

        return { success: false, error: 'Erro inesperado ao realizar login.' };
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error('Login error', err);
        return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
      } finally {
        // Always clear the flag so subsequent events are handled normally
        loginInProgressRef.current = false;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setUser(null);
    profileLoadingRef.current = false;
    loginInProgressRef.current = false;

    // Clear all session-specific localStorage data
    try {
      localStorage.removeItem('hierarchySelection.v1');
      localStorage.removeItem('agro-farms');
      localStorage.removeItem('selectedAnalystId');
      localStorage.removeItem('selectedClientId');
      localStorage.removeItem('selectedFarm');
      localStorage.removeItem('selectedFarmId');
    } catch {
      // Ignore storage errors
    }

    try {
      await supabase.auth.signOut();
    } catch (error: unknown) {
      log.error('Logout error', error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  /**
   * Google OAuth login.
   *
   * After the OAuth redirect, Supabase fires SIGNED_IN which is handled above.
   * The redirectTo URL must be registered in:
   *   1. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
   *   2. Google Cloud Console → OAuth 2.0 → Authorized redirect URIs
   */
  const signInWithOAuth = useCallback(async (provider: 'google') => {
    try {
      // Clear any stale session BEFORE redirecting to avoid race conditions:
      // Without this, on return from Google the SDK tries to auto-refresh the
      // old (now-invalid) refresh_token, which races with the PKCE exchange
      // and can corrupt session state → infinite loop.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => { });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        log.error('OAuth error', new Error(error.message));
        throw error;
      }

      return data;
    } catch (error: unknown) {
      log.error('OAuth error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      phone: string,
      organizationName?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              full_name: name,
              organization_name: organizationName || `${name}'s Organization`,
              role: 'client',
              plan: 'basic',
              avatar: name.charAt(0).toUpperCase(),
              phone,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          log.error('Signup error', new Error(error.message));
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Render app immediately with fallback user
          setUser(buildFallbackUser(data.user));
          setIsLoading(false);

          // Load full profile progressively in background
          // loadProfileWithRetry handles profile creation internally
          if (!profileLoadingRef.current) {
            profileLoadingRef.current = true;
            loadProfileWithRetry(data.user.id)
              .then(profile => {
                if (profile) {
                  setUser(profile);
                } else {
                  // Profile will be created by DB trigger — update phone when it appears
                  supabase
                    .from('user_profiles')
                    .update({ phone })
                    .eq('id', data.user!.id)
                    .then(({ error: updateErr }) => {
                      if (updateErr) log.warn('Could not update phone in profile');
                    });
                }
              })
              .catch((err: unknown) =>
                log.error('Profile load after signup failed', err instanceof Error ? err : new Error(String(err))),
              )
              .finally(() => {
                profileLoadingRef.current = false;
              });
          }

          return { success: true };
        }

        return { success: false, error: 'Erro ao criar conta' };
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error('Signup error', err);
        return { success: false, error: err.message || 'Erro ao criar conta' };
      }
    },
    [],
  );

  const checkPermission = useCallback(
    (feature: string): boolean => checkPermissionUtil(user, feature),
    [user],
  );

  const checkLimit = useCallback(
    (limit: keyof Plan['limits'], currentValue: number): boolean => checkLimitUtil(user, limit, currentValue),
    [user],
  );

  const upgradePlan = useCallback(
    async (planId: Plan['id']) => {
      if (!user) return;
      try {
        const { error } = await supabase.from('user_profiles').update({ plan: planId }).eq('id', user.id);
        if (error) {
          log.error('Error upgrading plan', new Error(error.message));
          return;
        }
        setUser({ ...user, plan: planId });
      } catch (error: unknown) {
        log.error('Error upgrading plan', error instanceof Error ? error : new Error(String(error)));
      }
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await loadUserProfile(user.id, 1, 0);
      if (profile) setUser(profile);
    } catch (error: unknown) {
      log.error('Error refreshing profile', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      log.debug(`Sending password reset email with redirect URL: ${redirectUrl}`);

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

      if (error) {
        log.error('Reset password error', new Error(error.message));
        const errorMsg = error.message.toLowerCase();
        let errorMessage = 'Erro ao enviar email de recuperação.';

        if (errorMsg.includes('user not found') || errorMsg.includes('user_not_found')) {
          errorMessage = 'Email não encontrado. Verifique se o email está correto.';
        } else if (errorMsg.includes('invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.';
        } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        }

        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Reset password error', err);
      return { success: false, error: err.message || 'Erro inesperado ao enviar email de recuperação.' };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        log.error('Update password error', new Error(error.message));
        const errorMsg = error.message.toLowerCase();
        let errorMessage = 'Erro ao atualizar senha.';

        if (errorMsg.includes('password')) {
          errorMessage = 'A senha não atende aos requisitos mínimos.';
        } else if (errorMsg.includes('token') || errorMsg.includes('expired')) {
          errorMessage = 'Link de recuperação expirado ou inválido. Solicite um novo link.';
        }

        return { success: false, error: errorMessage };
      }

      setIsPasswordRecovery(false);
      return { success: true };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('Update password error', err);
      return { success: false, error: err.message || 'Erro inesperado ao atualizar senha.' };
    }
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const authContextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      isLoading,
      isPasswordRecovery,
      checkPermission,
      checkLimit,
      upgradePlan,
      refreshProfile,
      signInWithOAuth,
      signup,
      resetPassword,
      updatePassword,
      clearPasswordRecovery,
    }),
    [
      user,
      login,
      logout,
      isLoading,
      isPasswordRecovery,
      checkPermission,
      checkLimit,
      upgradePlan,
      refreshProfile,
      signInWithOAuth,
      signup,
      resetPassword,
      updatePassword,
      clearPasswordRecovery,
    ],
  );

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
