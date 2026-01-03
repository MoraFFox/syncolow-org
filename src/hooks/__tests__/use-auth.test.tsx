import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { User } from '@/lib/types';

// Mock supabase
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (params: { email: string; password: string }) => mockSignInWithPassword(params),
      signOut: () => mockSignOut(),
      signUp: (params: { email: string; password: string; options?: Record<string, unknown> }) => mockSignUp(params),
      resetPasswordForEmail: (email: string, options: { redirectTo: string }) => mockResetPasswordForEmail(email, options),
      updateUser: (data: Record<string, unknown>) => mockUpdateUser(data),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      },
    },
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Import after mocks
import { AuthProvider, useAuth } from '../use-auth';

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no session
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation(() => ({ data: { subscription: { unsubscribe: mockUnsubscribe } } }));

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3001' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth context validation', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('AuthProvider initialization', () => {
    it('should initialize with loading state', () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
    });

    it('should set user from session on mount', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            role: 'Admin',
          },
        },
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.jpg',
        role: 'Admin',
      });
    });

    it('should set user to null when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should use displayName fallback when full_name not present', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            displayName: 'Display Name',
          },
        },
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.displayName).toBe('Display Name');
    });

    it('should default role to Admin when not in metadata', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        },
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.role).toBe('Admin');
    });
  });

  describe('login', () => {
    it('should call signInWithPassword with credentials', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on login failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const loginError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValue({ error: loginError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should call signOut and redirect to login', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('register', () => {
    it('should call signUp with email, password, and default role', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'newpassword');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword',
        options: {
          data: {
            role: 'Admin',
          },
        },
      });
    });

    it('should throw error on registration failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const registerError = new Error('Email already exists');
      mockSignUp.mockResolvedValue({ data: null, error: registerError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register('existing@example.com', 'password');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('requestPasswordReset', () => {
    it('should call resetPasswordForEmail with correct redirect URL', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.requestPasswordReset('reset@example.com');
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'reset@example.com',
        {
          redirectTo: 'http://localhost:3001/auth/callback?next=/account/update-password',
        }
      );
    });

    it('should throw error on reset failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const resetError = new Error('User not found');
      mockResetPasswordForEmail.mockResolvedValue({ error: resetError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.requestPasswordReset('unknown@example.com');
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user with displayName and full_name', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockUpdateUser.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProfile({ displayName: 'New Name' });
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          displayName: 'New Name',
          full_name: 'New Name',
        },
      });
    });

    it('should throw error on update failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const updateError = new Error('Update failed');
      mockUpdateUser.mockResolvedValue({ error: updateError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateProfile({ displayName: 'Test' });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('updateProfilePicture', () => {
    it('should throw error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await expect(
        act(async () => {
          await result.current.updateProfilePicture(file);
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should upload file and update user metadata', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        },
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.com/user-123.jpg' } });
      mockUpdateUser.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.updateProfilePicture(file);
      });

      expect(mockUpload).toHaveBeenCalledWith('user-123.jpg', file, { upsert: true });
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          photoURL: 'https://storage.com/user-123.jpg',
          avatar_url: 'https://storage.com/user-123.jpg',
        },
      });
    });

    it('should throw error on upload failure', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        },
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      const uploadError = new Error('Upload failed');
      mockUpload.mockResolvedValue({ error: uploadError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

      await expect(
        act(async () => {
          await result.current.updateProfilePicture(file);
        })
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });
    });

    it('should update user when auth state changes', async () => {
      let authCallback: ((event: string, session: { user: Record<string, unknown> } | null) => void) | null = null;

      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change
      const newSession = {
        user: {
          id: 'user-new',
          email: 'new@example.com',
          user_metadata: {
            full_name: 'New User',
            role: 'Admin',
          },
        },
      };

      await act(async () => {
        if (authCallback) {
          authCallback('SIGNED_IN', newSession);
        }
      });

      await waitFor(() => {
        expect(result.current.user?.id).toBe('user-new');
      });
    });

    it('should only update user when data actually changes', async () => {
      let authCallback: ((event: string, session: { user: Record<string, unknown> } | null) => void) | null = null;

      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
            role: 'Admin',
          },
        },
      };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user?.id).toBe('user-123');
      });

      const originalUser = result.current.user;

      // Trigger auth change with same data
      await act(async () => {
        if (authCallback) {
          authCallback('TOKEN_REFRESHED', mockSession);
        }
      });

      // User reference should be the same (no unnecessary update)
      expect(result.current.user).toBe(originalUser);
    });

    it('should unsubscribe on unmount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
