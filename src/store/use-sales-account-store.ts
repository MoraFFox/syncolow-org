import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { SalesAccount } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

interface SalesAccountState {
    accounts: SalesAccount[];
    defaultAccountId: string | null;
    loading: boolean;

    // Actions
    fetchAccounts: () => Promise<void>;
    setAccounts: (accounts: SalesAccount[]) => void; // For hydration from DB
    addAccount: (account: Omit<SalesAccount, 'id'> | SalesAccount) => Promise<SalesAccount>;
    updateAccount: (id: string, updates: Partial<SalesAccount>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    setDefaultAccount: (id: string | null) => void;
    getAccountByCode: (code: string) => SalesAccount | undefined;
    getAccountById: (id: string) => SalesAccount | undefined;
}

export const useSalesAccountStore = create<SalesAccountState>()(
    persist(
        (set, get) => ({
            accounts: [],
            defaultAccountId: null,
            loading: false,

            fetchAccounts: async () => {
                set({ loading: true });
                try {
                    const { data, error } = await supabase
                        .from('sales_accounts')
                        .select('*')
                        .order('name');

                    if (error) throw error;

                    // DEBUG: Log raw data from database
                    console.warn('[SalesAccountStore] fetchAccounts - raw data:', JSON.stringify(data?.slice(0, 3)));

                    // Transform DB rows to SalesAccount format
                    const accounts: SalesAccount[] = (data || []).map((row: {
                        id: string;
                        codes: string[];
                        name: string;
                        color: string;
                        description?: string;
                        is_default?: boolean;
                    }) => ({
                        id: row.id,
                        codes: row.codes || [],
                        name: row.name,
                        color: row.color,
                        description: row.description,
                        isDefault: row.is_default,
                    }));

                    // DEBUG: Log transformed accounts
                    console.warn('[SalesAccountStore] fetchAccounts - transformed accounts:', accounts.map(a => ({ name: a.name, codes: a.codes })));

                    // Find default account
                    const defaultAcc = accounts.find(a => a.isDefault);
                    set({
                        accounts,
                        defaultAccountId: defaultAcc?.id || null,
                        loading: false
                    });
                } catch (error) {
                    console.error('[SalesAccountStore] fetchAccounts error:', error);
                    set({ loading: false });
                }
            },

            setAccounts: (accounts) => {
                set({ accounts });
            },

            addAccount: async (accountData) => {
                // Generate ID if not provided
                const newAccount: SalesAccount = 'id' in accountData && accountData.id
                    ? accountData as SalesAccount
                    : { ...accountData, id: uuidv4(), codes: (accountData as Omit<SalesAccount, 'id'>).codes || [] };

                try {
                    // Get current user for RLS
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        throw new Error('Not authenticated');
                    }

                    // Insert into database with user_id for RLS
                    const { error } = await supabase
                        .from('sales_accounts')
                        .insert({
                            id: newAccount.id,
                            user_id: user.id, // Required for RLS policy
                            codes: newAccount.codes,
                            name: newAccount.name,
                            color: newAccount.color,
                            description: newAccount.description || null,
                            is_default: newAccount.isDefault || false,
                        });

                    if (error) throw error;

                    // Update local state
                    set((state) => {
                        const updatedAccounts = [...state.accounts, newAccount];
                        return { accounts: updatedAccounts };
                    });

                    // Auto-set as default if it's the first one
                    if (get().accounts.length === 1) {
                        set({ defaultAccountId: newAccount.id });
                    }

                    console.warn('[SalesAccountStore] Account created:', newAccount.name);
                    return newAccount;
                } catch (error) {
                    console.error('[SalesAccountStore] addAccount error:', error);
                    toast({
                        title: 'Failed to create account',
                        description: (error as Error).message,
                        variant: 'destructive'
                    });
                    throw error;
                }
            },

            updateAccount: async (id, updates) => {
                try {
                    // Prepare DB-compatible updates
                    const dbUpdates: Record<string, unknown> = {};
                    if (updates.codes !== undefined) dbUpdates.codes = updates.codes;
                    if (updates.name !== undefined) dbUpdates.name = updates.name;
                    if (updates.color !== undefined) dbUpdates.color = updates.color;
                    if (updates.description !== undefined) dbUpdates.description = updates.description;
                    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

                    const { error } = await supabase
                        .from('sales_accounts')
                        .update(dbUpdates)
                        .eq('id', id);

                    if (error) throw error;

                    // Update local state
                    set((state) => ({
                        accounts: state.accounts.map((acc) =>
                            acc.id === id ? { ...acc, ...updates } : acc
                        ),
                    }));

                    console.warn('[SalesAccountStore] Account updated:', id);
                } catch (error) {
                    console.error('[SalesAccountStore] updateAccount error:', error);
                    toast({
                        title: 'Failed to update account',
                        description: (error as Error).message,
                        variant: 'destructive'
                    });
                    throw error;
                }
            },

            deleteAccount: async (id) => {
                try {
                    const { error } = await supabase
                        .from('sales_accounts')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    // Update local state
                    set((state) => ({
                        accounts: state.accounts.filter((acc) => acc.id !== id),
                        defaultAccountId: state.defaultAccountId === id ? null : state.defaultAccountId,
                    }));

                    console.warn('[SalesAccountStore] Account deleted:', id);
                } catch (error) {
                    console.error('[SalesAccountStore] deleteAccount error:', error);
                    toast({
                        title: 'Failed to delete account',
                        description: (error as Error).message,
                        variant: 'destructive'
                    });
                    throw error;
                }
            },

            setDefaultAccount: (id) => {
                set({ defaultAccountId: id });
            },

            getAccountByCode: (code) => {
                const normalizedCode = code.trim();
                return get().accounts.find(
                    (acc) => acc.codes.some(c => c.trim() === normalizedCode)
                );
            },

            getAccountById: (id) => {
                return get().accounts.find((acc) => acc.id === id);
            }
        }),
        {
            name: 'sales-account-storage',
        }
    )
);
