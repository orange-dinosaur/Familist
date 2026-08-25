import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { type TodoItem } from '@/constants/mock-data';
import { useFamily } from '@/hooks/use-family';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { writeFailure } from '@/store/remote-client';
import { createRemoteStore } from '@/store/remote-store';

const TODOS = { path: '/api/todos', one: 'todo', many: 'todos' };

const NO_FAMILY = 'You are not in a family yet.';

interface TodosContextValue {
    todos: TodoItem[];
    loading: boolean;
    /** Every write answers with the reason it did not work, or null. */
    addTodo: (
        label: string,
        priority: TodoItem['priority'],
        day: string,
        assigneeId?: string
    ) => Promise<string | null>;
    toggleTodo: (id: string) => Promise<string | null>;
    deleteTodo: (id: string) => Promise<string | null>;
    editTodo: (
        id: string,
        label: string,
        priority: TodoItem['priority'],
        day: string,
        assigneeId?: string
    ) => Promise<string | null>;
    assignTodo: (
        id: string,
        assigneeId: string | undefined
    ) => Promise<string | null>;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const familyId = family?.id ?? null;

    const store = useMemo(
        () => (familyId ? createRemoteStore<TodoItem>(TODOS) : null),
        [familyId]
    );

    const { items: todos, loading } = useStoreCollection(store);

    const addTodo = useCallback(
        async (
            label: string,
            priority: TodoItem['priority'],
            day: string,
            assigneeId?: string
        ) => {
            if (!store) return NO_FAMILY;
            try {
                await store.create({
                    label,
                    done: false,
                    priority,
                    assigneeId,
                    day,
                });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not add that task.');
            }
        },
        [store]
    );

    const toggleTodo = useCallback(
        async (id: string) => {
            if (!store) return NO_FAMILY;
            try {
                const current = await store.list();
                const todo = current.find((item) => item.id === id);
                if (todo) {
                    await store.update(id, { done: !todo.done });
                }
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not change that task.');
            }
        },
        [store]
    );

    const deleteTodo = useCallback(
        async (id: string) => {
            if (!store) return NO_FAMILY;
            try {
                await store.remove(id);
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not delete that task.');
            }
        },
        [store]
    );

    /** An omitted assignee here means clear it, so it travels as null. */
    const editTodo = useCallback(
        async (
            id: string,
            label: string,
            priority: TodoItem['priority'],
            day: string,
            assigneeId?: string
        ) => {
            if (!store) return NO_FAMILY;
            try {
                await store.update(id, {
                    label,
                    priority,
                    day,
                    assigneeId: assigneeId ?? null,
                });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not save that task.');
            }
        },
        [store]
    );

    const assignTodo = useCallback(
        async (id: string, assigneeId: string | undefined) => {
            if (!store) return NO_FAMILY;
            try {
                await store.update(id, { assigneeId: assigneeId ?? null });
                return null;
            } catch (error) {
                return writeFailure(error, 'Could not assign that task.');
            }
        },
        [store]
    );

    return (
        <TodosContext.Provider
            value={{
                todos,
                loading: familyLoading || loading,
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
