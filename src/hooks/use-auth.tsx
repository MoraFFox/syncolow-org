

"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { db, app, storage } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  AuthError,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


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
const auth = getAuth(app);

// In a test environment, Firebase's browser-based persistence can cause errors.
// This sets it to in-memory persistence when running in Jest.
if (process.env.NODE_ENV === 'test') {
    setPersistence(auth, inMemoryPersistence);
}

const handleAuthError = (error: unknown): string => {
    const err = error as AuthError;
    switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email address already exists.';
        case 'auth/weak-password':
            return 'The password is too weak. It must be at least 6 characters long.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        default:
            console.error("Authentication error:", err);
            return 'An unexpected error occurred. Please try again later.';
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: 'Admin', 
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const login = async (email: string, password: string): Promise<void> => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        throw new Error(handleAuthError(error));
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const newUser: Omit<User, 'id' | 'password'> = {
        email,
        role: 'Admin'
        };
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    } catch (error) {
        throw new Error(handleAuthError(error));
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch(error) {
        throw new Error(handleAuthError(error));
    }
  }

  const updateProfile = async (data: { displayName?: string }) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    await firebaseUpdateProfile(auth.currentUser, data);
    // Manually update local state to reflect changes immediately
    setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
  }

  const updateProfilePicture = async (file: File) => {
    if (!auth.currentUser) throw new Error("Not authenticated");

    const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(storageRef);

    await firebaseUpdateProfile(auth.currentUser, { photoURL });
     // Manually update local state
    setUser(prevUser => prevUser ? { ...prevUser, photoURL } : null);
  }


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
