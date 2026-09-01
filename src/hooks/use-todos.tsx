import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type TodoItem } from '@/constants/types';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { useStoreWrites } from '@/hooks/use-store-writes';
import { createSyncedStore } from '@/store/synced-store';

const TODOS = { path: '/api/todos', one: 'todo', many: 'todos' };

interface TodosContextValue {
    todos: TodoItem[];
    loading: boolean;
    /** The reason the last write did not work, or null. */
    error: string | null;
    clearError: () => void;
    /** Every write answers whether it went through. */
    addTodo: (
        label: string,
        priority: TodoItem['priority'],
        day: string | null,
        assigneeId?: string
    ) => Promise<boolean>;
    toggleTodo: (id: string) => Promise<boolean>;
    deleteTodo: (id: string) => Promise<boolean>;
    editTodo: (
        id: string,
        label: string,
        priority: TodoItem['priority'],
        day: string | null,
        assigneeId?: string
    ) => Promise<boolean>;
    assignTodo: (
        id: string,
        assigneeId: string | undefined
    ) => Promise<boolean>;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () =>
            familyId
                ? createSyncedStore<TodoItem>(
                      `familist.todos.${familyId}`,
                      TODOS,
                      'familist.todos'
                  )
                : null,
        [familyId]
    );

    const { items: todos, loading } = useStoreCollection(store);
    const { error, clearError, write } = useStoreWrites(store);

    const addTodo = useCallback(
        (
            label: string,
            priority: TodoItem['priority'],
            day: string | null,
            assigneeId?: string
        ) =>
            write('Could not add that task.', (store) =>
                store.create({ label, done: false, priority, assigneeId, day })
            ),
        [write]
    );

    /**
     * The completion time travels with the tick so the record on the device
     * sorts right away; the route stamps its own over it on the way back.
     */
    const toggleTodo = useCallback(
        (id: string) =>
            write('Could not change that task.', async (store) => {
                const current = await store.list();
                const todo = current.find((item) => item.id === id);
                if (!todo) return;
                const done = !todo.done;
                await store.update(id, {
                    done,
                    completedAt: done ? new Date().toISOString() : null,
                });
            }),
        [write]
    );

    const deleteTodo = useCallback(
        (id: string) =>
            write('Could not delete that task.', (store) => store.remove(id)),
        [write]
    );

    /** An omitted assignee here means clear it, so it travels as null. */
    const editTodo = useCallback(
        (
            id: string,
            label: string,
            priority: TodoItem['priority'],
            day: string | null,
            assigneeId?: string
        ) =>
            write('Could not save that task.', (store) =>
                store.update(id, {
                    label,
                    priority,
                    day,
                    assigneeId: assigneeId ?? null,
                })
            ),
        [write]
    );

    const assignTodo = useCallback(
        (id: string, assigneeId: string | undefined) =>
            write('Could not assign that task.', (store) =>
                store.update(id, { assigneeId: assigneeId ?? null })
            ),
        [write]
    );

    return (
        <TodosContext.Provider
            value={{
                todos,
                loading: familyLoading || loading,
                error,
                clearError,
                addTodo,
                toggleTodo,
                deleteTodo,
                editTodo,
                assignTodo,
            }}>
            {children}
        </TodosContext.Provider>
    );
}

export function useTodos(): TodosContextValue {
    const context = useContext(TodosContext);
    if (!context) {
        throw new Error('useTodos must be used within a TodosProvider');
    }
    return context;
}
