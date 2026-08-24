import React, { createContext, useContext, useCallback } from 'react';

import { type TodoItem } from '@/constants/mock-data';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { createLocalStore } from '@/store/local-store';

const store = createLocalStore<TodoItem>('familist.todos');

interface TodosContextValue {
    todos: TodoItem[];
    loading: boolean;
    addTodo: (
        label: string,
        priority: TodoItem['priority'],
        day: string,
        assigneeId?: string
    ) => void;
    toggleTodo: (id: string) => void;
    deleteTodo: (id: string) => void;
    editTodo: (
        id: string,
        label: string,
        priority: TodoItem['priority'],
        day: string,
        assigneeId?: string
    ) => void;
    assignTodo: (id: string, assigneeId: string | undefined) => void;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
    const { items: todos, loading } = useStoreCollection(store);

    const addTodo = useCallback(
        async (
            label: string,
            priority: TodoItem['priority'],
            day: string,
            assigneeId?: string
        ) => {
            await store.create({
                label,
                done: false,
                priority,
                assigneeId,
                day,
            });
        },
        []
    );

    const toggleTodo = useCallback(async (id: string) => {
        const current = await store.list();
        const todo = current.find((item) => item.id === id);
        if (todo) {
            await store.update(id, { done: !todo.done });
        }
    }, []);

    const deleteTodo = useCallback(async (id: string) => {
        await store.remove(id);
    }, []);

    const editTodo = useCallback(
        async (
            id: string,
            label: string,
            priority: TodoItem['priority'],
            day: string,
            assigneeId?: string
        ) => {
            await store.update(id, { label, priority, day, assigneeId });
        },
        []
    );

    const assignTodo = useCallback(
        async (id: string, assigneeId: string | undefined) => {
            await store.update(id, { assigneeId });
        },
        []
    );

    return (
        <TodosContext.Provider
            value={{
                todos,
                loading,
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
