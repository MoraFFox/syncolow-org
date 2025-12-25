import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { SalesAccount } from '@/lib/types';
import { useSalesAccountStore } from '@/store/use-sales-account-store';

interface UseSalesAccountsReturn {
    accounts: SalesAccount[];
    defaultAccountId: string | null;
    isLoading: boolean;
    error: string | null;
    addAccount: (data: Omit<SalesAccount, 'id'>) => Promise<SalesAccount | null>;
    updateAccount: (id: string, data: Partial<SalesAccount>) => Promise<boolean>;
    deleteAccount: (id: string) => Promise<boolean>;
    setDefaultAccount: (id: string | null) => Promise<boolean>;
    refreshAccounts: () => Promise<void>;
}

/**
 * Hook for fetching and managing Sales Accounts from Supabase.
 * Syncs with the Zustand store for local state management.
 */
export function useSalesAccounts(): UseSalesAccountsReturn {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get stable Zustand store actions individually to avoid dependency loops
    const setAccounts = useSalesAccountStore(state => state.setAccounts);
    const addAccountToStore = useSalesAccountStore(state => state.addAccount);
    const updateAccountInStore = useSalesAccountStore(state => state.updateAccount);
    const deleteAccountFromStore = useSalesAccountStore(state => state.deleteAccount);
    const setDefaultAccountIdInStore = useSalesAccountStore(state => state.setDefaultAccount);
    const storeAccounts = useSalesAccountStore(state => state.accounts);
    const defaultAccountIdFromStore = useSalesAccountStore(state => state.defaultAccountId);

    /**
     * Fetch all Sales Accounts from Supabase and sync with store
     */
    const fetchAccounts = useCallback(async () => {
        if (!user?.id) {
            setAccounts([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('sales_accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Define row type for Supabase response
            interface SalesAccountRow {
                id: string;
                codes: string[]; // Updated for multi-code support
                name: string;
                color: string;
                description: string | null;
                is_default: boolean | null;
            }

            // Map database rows to SalesAccount type
            const accounts: SalesAccount[] = (data as any[] ?? []).map((row: any) => ({
                id: row.id,
                codes: row.codes || [], // Ensure array
                name: row.name,
                color: row.color,
                description: row.description ?? undefined,
                isDefault: row.is_default ?? false,
            }));

            // Sync with Zustand store
            setAccounts(accounts);

            // Find and set default
            const defaultAcc = accounts.find(a => a.isDefault);
            if (defaultAcc) {
                setDefaultAccountIdInStore(defaultAcc.id);
            }

        } catch (err) {
            logger.error(err, {
                component: 'useSalesAccounts',
                action: 'fetchAccounts',
                userId: user.id
            });
            setError('Failed to load sales accounts');
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, setAccounts, setDefaultAccountIdInStore]);

    /**
     * Add a new Sales Account
     */
    const addAccount = useCallback(async (data: Omit<SalesAccount, 'id'>): Promise<SalesAccount | null> => {
        if (!user?.id) {
            toast({ title: 'Not logged in', variant: 'destructive' });
            return null;
        }

        try {
            const insertData = {
                user_id: user.id,
                codes: data.codes,
                name: data.name,
                color: data.color,
                description: data.description ?? null,
                is_default: data.isDefault ?? false,
            };

            const { data: result, error: insertError } = await supabase
                .from('sales_accounts')
                .insert(insertData)
                .select()
                .single();

            if (insertError) throw insertError;

            const newAccount: SalesAccount = {
                id: result.id,
                codes: result.codes || [],
                name: result.name,
                color: result.color,
                description: result.description ?? undefined,
                isDefault: result.is_default ?? false,
            };

            // Update local store
            addAccountToStore(newAccount);

            toast({ title: 'Account Created', description: `Sales Account "${data.name}" created.` });
            return newAccount;
        } catch (err) {
            logger.error(err, { component: 'useSalesAccounts', action: 'addAccount' });
            toast({ title: 'Failed to create account', variant: 'destructive' });
            return null;
        }
    }, [user?.id, addAccountToStore, toast]);

    /**
     * Update an existing Sales Account
     */
    const updateAccount = useCallback(async (id: string, data: Partial<SalesAccount>): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (data.codes !== undefined) updateData.codes = data.codes;
            if (data.name !== undefined) updateData.name = data.name;
            if (data.color !== undefined) updateData.color = data.color;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

            const { error: updateError } = await supabase
                .from('sales_accounts')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            // Update local store
            updateAccountInStore(id, data);

            toast({ title: 'Account Updated' });
            return true;
        } catch (err) {
            logger.error(err, { component: 'useSalesAccounts', action: 'updateAccount' });
            toast({ title: 'Failed to update account', variant: 'destructive' });
            return false;
        }
    }, [user?.id, updateAccountInStore, toast]);

    /**
     * Delete a Sales Account
     */
    const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            const { error: deleteError } = await supabase
                .from('sales_accounts')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // Update local store
            deleteAccountFromStore(id);

            toast({ title: 'Account Deleted' });
            return true;
        } catch (err) {
            logger.error(err, { component: 'useSalesAccounts', action: 'deleteAccount' });
            toast({ title: 'Failed to delete account', variant: 'destructive' });
            return false;
        }
    }, [user?.id, deleteAccountFromStore, toast]);

    /**
     * Set the default account
     */
    const setDefaultAccount = useCallback(async (id: string | null): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            if (id) {
                // The database trigger handles unsetting other defaults
                const { error: updateError } = await supabase
                    .from('sales_accounts')
                    .update({ is_default: true, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (updateError) throw updateError;
            }

            // Update local store
            setDefaultAccountIdInStore(id);

            toast({ title: id ? 'Default Account Set' : 'Default Account Cleared' });
            return true;
        } catch (err) {
            logger.error(err, { component: 'useSalesAccounts', action: 'setDefaultAccount' });
            toast({ title: 'Failed to set default account', variant: 'destructive' });
            return false;
        }
    }, [user?.id, setDefaultAccountIdInStore, toast]);

    /**
     * Refresh accounts from server
     */
    const refreshAccounts = useCallback(async () => {
        await fetchAccounts();
    }, [fetchAccounts]);

    // Fetch accounts on mount and when user changes
    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts: storeAccounts,
        defaultAccountId: defaultAccountIdFromStore,
        isLoading,
        error,
        addAccount,
        updateAccount,
        deleteAccount,
        setDefaultAccount,
        refreshAccounts,
    };
}
