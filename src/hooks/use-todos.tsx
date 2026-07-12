import React, { createContext, useContext, useState, useCallback } from 'react';

import { todoItems, type TodoItem } from '@/constants/mock-data';

interface TodosContextValue {
    todos: TodoItem[];
    addTodo: (label: string, priority: TodoItem['priority']) => void;
    toggleTodo: (id: string) => void;
    deleteTodo: (id: string) => void;
    editTodo: (
        id: string,
        label: string,
        priority: TodoItem['priority']
    ) => void;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
    const [todos, setTodos] = useState<TodoItem[]>(todoItems);

    const addTodo = useCallback(
        (label: string, priority: TodoItem['priority']) => {
            const newTodo: TodoItem = {
                id:
                    Math.random().toString(36).substring(7) ||
                    Date.now().toString(),
                label,
                done: false,
                priority,
            };
            setTodos((prev) => [...prev, newTodo]);
        },
        []
    );

    const toggleTodo = useCallback((id: string) => {
        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === id ? { ...todo, done: !todo.done } : todo
            )
        );
    }, []);

    const deleteTodo = useCallback((id: string) => {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
    }, []);

    const editTodo = useCallback(
        (id: string, label: string, priority: TodoItem['priority']) => {
            setTodos((prev) =>
                prev.map((todo) =>
                    todo.id === id ? { ...todo, label, priority } : todo
                )
            );
        },
        []
    );

    return (
        <TodosContext.Provider
            value={{ todos, addTodo, toggleTodo, deleteTodo, editTodo }}>
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
