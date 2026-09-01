import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { getRelativeDateString } from '@/constants/dates';
import { type ActivityItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const ACTIVITIES = {
    path: '/api/activities',
    one: 'activity',
    many: 'activities',
};

/**
 * The whole record, the way the subscriptions provider takes one: an activity
 * now carries four fields, and the call sites read better than the positional
 * arguments `use-todos.tsx` uses.
 */
export type ActivityInput = Omit<ActivityItem, 'id'>;

interface ActivitiesContextValue {
    activities: ActivityItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addActivity: (input: ActivityInput) => Promise<boolean>;
    editActivity: (id: string, input: ActivityInput) => Promise<boolean>;
    markDone: (id: string) => Promise<boolean>;
    deleteActivity: (id: string) => Promise<boolean>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<ActivityItem>(
                      `familist.activities.${familyId}`,
                      ACTIVITIES,
                      'familist.activities'
                  )
                : null,
        [familyId]
    );

    const { items: activities, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    /** An activity may be added with the last time it was done already known. */
    const addActivity = useCallback(
        (input: ActivityInput) =>
            write('Could not add that activity.', (store) =>
                store.create({ ...input, assigneeId: input.assigneeId ?? null })
            ),
        [write]
    );

    const editActivity = useCallback(
        (id: string, input: ActivityInput) =>
            write('Could not save that activity.', (store) =>
                store.update(id, {
                    ...input,
                    assigneeId: input.assigneeId ?? null,
                })
            ),
        [write]
    );

    /**
     * The day is the device's, the way every other day key in the app is. It
     * writes over whatever was there: only the latest time is kept.
     */
    const markDone = useCallback(
        (id: string) =>
            write('Could not mark that done.', (store) =>
                store.update(id, { lastDoneOn: getRelativeDateString(0) })
            ),
        [write]
    );

    const deleteActivity = useCallback(
        (id: string) =>
            write('Could not delete that activity.', (store) =>
                store.remove(id)
            ),
        [write]
    );

    return (
        <ActivitiesContext.Provider
            value={{
                activities,
                loading: familyLoading || loading,
                error,
                clearError,
                addActivity,
                editActivity,
                markDone,
                deleteActivity,
            }}>
            {children}
        </ActivitiesContext.Provider>
    );
}

export function useActivities(): ActivitiesContextValue {
    const context = useContext(ActivitiesContext);
    if (!context) {
        throw new Error(
            'useActivities must be used within an ActivitiesProvider'
        );
    }
    return context;
}
