import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { getRelativeDateString } from '@/constants/dates';
import { type PaymentItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const PAYMENTS = {
    path: '/api/payments',
    one: 'payment',
    many: 'payments',
};

export type PaymentInput = Omit<PaymentItem, 'id' | 'paid' | 'paidOn'>;

interface PaymentsContextValue {
    payments: PaymentItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addPayment: (input: PaymentInput) => Promise<boolean>;
    editPayment: (id: string, input: PaymentInput) => Promise<boolean>;
    togglePaid: (id: string) => Promise<boolean>;
    deletePayment: (id: string) => Promise<boolean>;
}

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<PaymentItem>(
                      `familist.payments.${familyId}`,
                      PAYMENTS,
                      'familist.payments'
                  )
                : null,
        [familyId]
    );

    const { items: payments, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    /** A payment is written down outstanding; settling it is its own move. */
    const addPayment = useCallback(
        (input: PaymentInput) =>
            write('Could not add that payment.', (store) =>
                store.create({
                    ...input,
                    payerId: input.payerId ?? null,
                    paid: false,
                    paidOn: null,
                })
            ),
        [write]
    );

    const editPayment = useCallback(
        (id: string, input: PaymentInput) =>
            write('Could not save that payment.', (store) =>
                store.update(id, {
                    ...input,
                    payerId: input.payerId ?? null,
                })
            ),
        [write]
    );

    /**
     * The day is the device's, the way every day key in the app is, and it
     * travels with the tick because the route keeps whatever it is sent.
     */
    const togglePaid = useCallback(
        (id: string) =>
            write('Could not change that payment.', async (store) => {
                const current = await store.list();
                const item = current.find((one) => one.id === id);
                if (!item) return;
                const paid = !item.paid;
                await store.update(id, {
                    paid,
                    paidOn: paid ? getRelativeDateString(0) : null,
                });
            }),
        [write]
    );

    const deletePayment = useCallback(
        (id: string) =>
            write('Could not delete that payment.', (store) =>
                store.remove(id)
            ),
        [write]
    );

    return (
        <PaymentsContext.Provider
            value={{
                payments,
                loading: familyLoading || loading,
                error,
                clearError,
                addPayment,
                editPayment,
                togglePaid,
                deletePayment,
            }}>
            {children}
        </PaymentsContext.Provider>
    );
}

export function usePayments(): PaymentsContextValue {
    const context = useContext(PaymentsContext);
    if (!context) {
        throw new Error('usePayments must be used within a PaymentsProvider');
    }
    return context;
}
