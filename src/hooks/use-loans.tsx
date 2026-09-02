import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { getRelativeDateString } from '@/constants/dates';
import { type LoanItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const LOANS = {
    path: '/api/loans',
    one: 'loan',
    many: 'loans',
};

export type LoanInput = Omit<LoanItem, 'id' | 'returned' | 'returnedOn'>;

interface LoansContextValue {
    loans: LoanItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addLoan: (input: LoanInput) => Promise<boolean>;
    editLoan: (id: string, input: LoanInput) => Promise<boolean>;
    toggleReturned: (id: string) => Promise<boolean>;
    deleteLoan: (id: string) => Promise<boolean>;
}

const LoansContext = createContext<LoansContextValue | null>(null);

export function LoansProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<LoanItem>(
                      `familist.loans.${familyId}`,
                      LOANS,
                      'familist.loans'
                  )
                : null,
        [familyId]
    );

    const { items: loans, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    /** A loan is written down while it is out; its return is its own move. */
    const addLoan = useCallback(
        (input: LoanInput) =>
            write('Could not add that loan.', (store) =>
                store.create({
                    ...input,
                    memberId: input.memberId ?? null,
                    returned: false,
                    returnedOn: null,
                })
            ),
        [write]
    );

    const editLoan = useCallback(
        (id: string, input: LoanInput) =>
            write('Could not save that loan.', (store) =>
                store.update(id, { ...input, memberId: input.memberId ?? null })
            ),
        [write]
    );

    /**
     * The day is the device's, the way every day key in the app is, and it
     * travels with the tick because the route keeps whatever it is sent.
     */
    const toggleReturned = useCallback(
        (id: string) =>
            write('Could not change that loan.', async (store) => {
                const current = await store.list();
                const item = current.find((one) => one.id === id);
                if (!item) return;
                const returned = !item.returned;
                await store.update(id, {
                    returned,
                    returnedOn: returned ? getRelativeDateString(0) : null,
                });
            }),
        [write]
    );

    const deleteLoan = useCallback(
        (id: string) =>
            write('Could not delete that loan.', (store) => store.remove(id)),
        [write]
    );

    return (
        <LoansContext.Provider
            value={{
                loans,
                loading: familyLoading || loading,
                error,
                clearError,
                addLoan,
                editLoan,
                toggleReturned,
                deleteLoan,
            }}>
            {children}
        </LoansContext.Provider>
    );
}

export function useLoans(): LoansContextValue {
    const context = useContext(LoansContext);
    if (!context) {
        throw new Error('useLoans must be used within a LoansProvider');
    }
    return context;
}
