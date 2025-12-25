import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SalesAccount } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface SalesAccountState {
    accounts: SalesAccount[];
    defaultAccountId: string | null;

    // Actions
    setAccounts: (accounts: SalesAccount[]) => void; // For hydration from DB
    addAccount: (account: Omit<SalesAccount, 'id'> | SalesAccount) => SalesAccount;
    updateAccount: (id: string, updates: Partial<SalesAccount>) => void;
    deleteAccount: (id: string) => void;
    setDefaultAccount: (id: string | null) => void;
    getAccountByCode: (code: string) => SalesAccount | undefined;
    getAccountById: (id: string) => SalesAccount | undefined;
}

export const useSalesAccountStore = create<SalesAccountState>()(
    persist(
        (set, get) => ({
            accounts: [],
            defaultAccountId: null,

            setAccounts: (accounts) => {
                set({ accounts });
            },

            addAccount: (accountData) => {
                // If already has id (from DB), use it; otherwise generate
                const newAccount: SalesAccount = 'id' in accountData && accountData.id
                    ? accountData as SalesAccount
                    : { ...accountData, id: uuidv4(), codes: (accountData as any).codes || [] };

                set((state) => {
                    const updatedAccounts = [...state.accounts, newAccount];
                    return { accounts: updatedAccounts };
                });

                // Auto-set as default if it's the first one
                if (get().accounts.length === 1) {
                    set({ defaultAccountId: newAccount.id });
                }

                return newAccount;
            },

            updateAccount: (id, updates) => {
                set((state) => ({
                    accounts: state.accounts.map((acc) =>
                        acc.id === id ? { ...acc, ...updates } : acc
                    ),
                }));
            },

            deleteAccount: (id) => {
                set((state) => ({
                    accounts: state.accounts.filter((acc) => acc.id !== id),
                    defaultAccountId: state.defaultAccountId === id ? null : state.defaultAccountId,
                }));
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
