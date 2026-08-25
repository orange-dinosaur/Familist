import React, { createContext, useContext, useCallback } from 'react';

import { type Member } from '@/constants/mock-data';
import { type MemberColor } from '@/constants/theme';
import { useStoreCollection } from '@/hooks/use-store-collection';
import { createLocalStore } from '@/store/local-store';
import { initialsOf } from '@/utils/member';

const store = createLocalStore<Member>('familist.members');

interface MembersContextValue {
    members: Member[];
    loading: boolean;
    addMember: (name: string, color: MemberColor) => void;
    editMember: (id: string, name: string, color: MemberColor) => void;
    removeMember: (id: string) => void;
}

const MembersContext = createContext<MembersContextValue | null>(null);

export function MembersProvider({ children }: { children: React.ReactNode }) {
    const { items: members, loading } = useStoreCollection(store);

    const addMember = useCallback(async (name: string, color: MemberColor) => {
        await store.create({
            name: name.trim(),
            initials: initialsOf(name),
            color,
        });
    }, []);

    const editMember = useCallback(
        async (id: string, name: string, color: MemberColor) => {
            await store.update(id, {
                name: name.trim(),
                initials: initialsOf(name),
                color,
            });
        },
        []
    );

    const removeMember = useCallback(async (id: string) => {
        await store.remove(id);
    }, []);

    return (
        <MembersContext.Provider
            value={{ members, loading, addMember, editMember, removeMember }}>
            {children}
        </MembersContext.Provider>
    );
}

export function useMembers(): MembersContextValue {
    const context = useContext(MembersContext);
    if (!context) {
        throw new Error('useMembers must be used within a MembersProvider');
    }
    return context;
}
