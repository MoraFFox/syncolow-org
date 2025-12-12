"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateProfile: (data: { displayName?: string }) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { user: supabaseUser } = session;
        const userProfile: User = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.displayName,
          photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.photoURL,
          role: supabaseUser.user_metadata?.role || 'Admin', // Default to Admin or fetch from metadata
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchSession();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        const { user: supabaseUser } = session;
        const newUserProfile: User = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.displayName,
          photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.photoURL,
          role: supabaseUser.user_metadata?.role || 'Admin',
        };

        // Only update if user data has actually changed
        setUser(prev => {
          if (!prev) return newUserProfile;
          if (
            prev.id === newUserProfile.id &&
            prev.email === newUserProfile.email &&
            prev.displayName === newUserProfile.displayName &&
            prev.photoURL === newUserProfile.photoURL &&
            prev.role === newUserProfile.role
          ) {
            return prev;
          }
          return newUserProfile;
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const register = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'Admin', // Default role
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Optional: Create a user record in a 'users' table if you have one
      // const { error: dbError } = await supabase.from('users').insert([{ id: data.user.id, email, role: 'Admin' }]);
      // if (dbError) console.error("Error creating user record:", dbError);
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/update-password`,
    });
    if (error) throw error;
  };

  const updateProfile = async (data: { displayName?: string }) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        displayName: data.displayName,
        full_name: data.displayName, // Sync both common keys
      },
    });
    if (error) throw error;

    // Local state update happens via onAuthStateChange
  };

  const updateProfilePicture = async (file: File) => {
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        photoURL: publicUrl,
        avatar_url: publicUrl,
      },
    });

    if (updateError) throw updateError;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, requestPasswordReset, updateProfile, updateProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
