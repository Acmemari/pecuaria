import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, Plan } from '../types';
import { supabase } from '../lib/supabase';
import { loadUserProfile } from '../lib/auth/loadUserProfile';
import { createUserProfileIfMissing } from '../lib/auth/createProfile';
import { checkPermission as checkPermissionUtil, checkLimit as checkLimitUtil } from '../lib/auth/permissions';
import { mapUserProfile } from '../lib/auth/mapUserProfile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      // Safety timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      );

      try {
        await Promise.race([
          (async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
              console.error('Error getting session:', error);
              return;
            }

            if (session?.user) {
              const userProfile = await loadUserProfile(session.user.id);
              setUser(userProfile);
            }
          })(),
          timeoutPromise
        ]);
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        if (error.message === 'Auth timeout') {
          console.warn('Authentication timed out. Forcing login screen.');
          // Ensure we don't have a stale session if it timed out
          await supabase.auth.signOut().catch(console.error);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        // Wait a bit for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to load profile
        let userProfile = await loadUserProfile(session.user.id, 3, 1000);

        // If profile still doesn't exist, try to create it
        if (!userProfile && session.user) {
          console.log('Profile not found, attempting to create using RPC...');
          const created = await createUserProfileIfMissing(session.user.id);

          if (created) {
            // Wait a bit more and try loading again
            await new Promise(resolve => setTimeout(resolve, 1500));
            userProfile = await loadUserProfile(session.user.id, 3, 1000);
          }
        }

        if (userProfile) {
          setUser(userProfile);
        } else {
          console.warn('Profile not found after SIGNED_IN event and creation attempt');
          // Even without profile, we can set a basic user object to allow access
          // The profile will be created by the trigger eventually
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'Usuário',
            role: (session.user.user_metadata?.role as 'admin' | 'client') || 'client',
            plan: (session.user.user_metadata?.plan as 'basic' | 'pro' | 'enterprise') || 'basic',
            avatar: session.user.user_metadata?.avatar || (session.user.email?.[0].toUpperCase() || 'U'),
            status: 'active'
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const userProfile = await loadUserProfile(session.user.id);
        if (userProfile) {
          setUser(userProfile);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        setIsLoading(false);

        // Map Supabase errors to user-friendly messages
        let errorMessage = 'Erro ao realizar login.';
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        }

        return { success: false, error: errorMessage };
      }

      if (data.user) {
        console.log('Login successful, user ID:', data.user.id);
        // Wait a moment for the trigger to potentially create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to load the profile with retries
        let userProfile = await loadUserProfile(data.user.id, 3, 1000);

        // If profile doesn't exist, try to create it
        if (!userProfile) {
          console.log('Profile not found after login, attempting to create...');
          const created = await createUserProfileIfMissing(data.user.id);

          if (created) {
            // Wait a bit more and try loading again
            await new Promise(resolve => setTimeout(resolve, 1500));
            userProfile = await loadUserProfile(data.user.id, 3, 1000);
          }
        }

        if (userProfile) {
          console.log('User profile loaded, setting user state');
          setUser(userProfile);
          setIsLoading(false);
          return { success: true };
        } else {
          console.warn('Profile not found after login and creation attempt');
          // Create a temporary user object from auth data
          // The profile will be created by trigger or on next login
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'Usuário',
            role: (data.user.user_metadata?.role as 'admin' | 'client') || 'client',
            plan: (data.user.user_metadata?.plan as 'basic' | 'pro' | 'enterprise') || 'basic',
            avatar: data.user.user_metadata?.avatar || (data.user.email?.[0].toUpperCase() || 'U'),
            status: 'active'
          });
          setIsLoading(false);
          return { success: true };
        }
      }

      setIsLoading(false);
      return { success: false, error: 'Erro inesperado ao realizar login.' };
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: error.message || 'Erro inesperado ao realizar login.' };
    }
  };

  const logout = async () => {
    // Clear user state immediately to ensure UI update
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signInWithOAuth = async (provider: 'google') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  };

  const checkPermission = (feature: string): boolean => {
    return checkPermissionUtil(user, feature);
  };

  const checkLimit = (limit: keyof Plan['limits'], currentValue: number): boolean => {
    return checkLimitUtil(user, limit, currentValue);
  };

  const signup = async (email: string, password: string, name: string, phone: string, organizationName?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name,
            organization_name: organizationName || `${name}'s Organization`,
            role: 'client',
            plan: 'basic',
            avatar: name.charAt(0).toUpperCase(),
            phone: phone
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update the profile with phone number if it exists
        // The trigger will create the profile, but we need to update it with phone
        try {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ phone: phone })
            .eq('id', data.user.id);

          if (updateError) {
            console.warn('Could not update phone in profile:', updateError);
            // Continue anyway - phone might be set later
          }
        } catch (err) {
          console.warn('Error updating phone:', err);
        }

        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to load the profile with retries
        const userProfile = await loadUserProfile(data.user.id, 5, 800);
        if (userProfile) {
          setUser(userProfile);
          setIsLoading(false);
          return { success: true };
        } else {
          // Wait a bit more and try again
          console.warn('Profile not found after signup, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          const retryProfile = await loadUserProfile(data.user.id, 3, 1000);
          if (retryProfile) {
            setUser(retryProfile);
            setIsLoading(false);
            return { success: true };
          }
        }

        setIsLoading(false);
        return { success: true }; // Return success even if profile not loaded yet - it will be created by trigger
      }

      setIsLoading(false);
      return { success: false, error: 'Erro ao criar conta' };
    } catch (error: any) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return { success: false, error: error.message || 'Erro ao criar conta' };
    }
  };

  const upgradePlan = async (planId: Plan['id']) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ plan: planId })
        .eq('id', user.id);

      if (error) {
        console.error('Error upgrading plan:', error);
        return;
      }

      // Update local state
      const updatedUser = { ...user, plan: planId };
      setUser(updatedUser);
    } catch (error) {
      console.error('Error upgrading plan:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      checkPermission,
      checkLimit,
      upgradePlan,
      signInWithOAuth,
      signup
    } as AuthContextType & {
      signInWithOAuth: (provider: 'google') => Promise<any>;
      signup: (email: string, password: string, name: string, phone: string, organizationName?: string) => Promise<{ success: boolean; error?: string }>;
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
