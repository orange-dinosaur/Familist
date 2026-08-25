import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import { apiFetch } from '@/auth/client';
import { type MemberColor } from '@/constants/theme';
import { useFamily } from '@/hooks/use-family';
import { adoptMembers } from '@/store/adopt-local';
import { type Member, type MemberRole } from '@/utils/member';

interface MembersContextValue {
    members: Member[];
    loading: boolean;
    addMember: (name: string, color: MemberColor) => Promise<string | null>;
    editMember: (
        id: string,
        name: string,
        color: MemberColor
    ) => Promise<string | null>;
    removeMember: (id: string) => Promise<string | null>;
    setRole: (id: string, role: MemberRole) => Promise<string | null>;
    revokeAccess: (id: string) => Promise<string | null>;
    removeFromFamily: (id: string) => Promise<string | null>;
}

const MembersContext = createContext<MembersContextValue | null>(null);

const asJson = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
};

export function MembersProvider({ children }: { children: React.ReactNode }) {
    const { family, loading: familyLoading } = useFamily();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const familyId = family?.id ?? null;

    useEffect(() => {
        if (familyLoading) return;

        if (!familyId) {
            setMembers([]);
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);

        /**
         * Members this device kept before step 20d are brought into the family
         * first, so the list that arrives already includes them. The same
         * promise is awaited by each collection's store, which needs the map
         * from old ids to new before it can adopt its own records.
         */
        adoptMembers()
            .catch(() => {})
            .then(() => apiFetch('/api/members'))
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (active) setMembers(body?.members ?? []);
            })
            .catch(() => {
                if (active) setMembers([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [familyId, familyLoading]);

    const addMember = useCallback(async (name: string, color: MemberColor) => {
        const res = await apiFetch('/api/members', {
            ...asJson,
            body: JSON.stringify({ name, color }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) return body?.error ?? 'Could not add that member.';

        /** Appending matches the server's order: oldest first. */
        setMembers((current) => [...current, body.member]);
        return null;
    }, []);

    const editMember = useCallback(
        async (id: string, name: string, color: MemberColor) => {
            const res = await apiFetch('/api/members/edit', {
                ...asJson,
                body: JSON.stringify({ memberId: id, name, color }),
            });
            const body = await res.json().catch(() => null);

            if (!res.ok) return body?.error ?? 'Could not save that member.';

            setMembers((current) =>
                current.map((member) =>
                    member.id === id ? body.member : member
                )
            );
            return null;
        },
        []
    );

    /**
     * Placeholders only. Taking an account member out of the family revokes a
     * real person's access and has its own routes and its own screen.
     */
    const removeMember = useCallback(async (id: string) => {
        const res = await apiFetch('/api/members/delete-placeholder', {
            ...asJson,
            body: JSON.stringify({ memberId: id }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) return body?.error ?? 'Could not remove that member.';

        setMembers((current) => current.filter((member) => member.id !== id));
        return null;
    }, []);

    const setRole = useCallback(async (id: string, role: MemberRole) => {
        const res = await apiFetch('/api/members/set-role', {
            ...asJson,
            body: JSON.stringify({ memberId: id, role }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) return body?.error ?? 'Could not change that role.';

        setMembers((current) =>
            current.map((member) => (member.id === id ? body.member : member))
        );
        return null;
    }, []);

    /** The member stays in the family, back to being a placeholder. */
    const revokeAccess = useCallback(async (id: string) => {
        const res = await apiFetch('/api/members/revoke-access', {
            ...asJson,
            body: JSON.stringify({ memberId: id }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) return body?.error ?? 'Could not revoke that access.';

        setMembers((current) =>
            current.map((member) => (member.id === id ? body.member : member))
        );
        return null;
    }, []);

    const removeFromFamily = useCallback(async (id: string) => {
        const res = await apiFetch('/api/members/remove-member', {
            ...asJson,
            body: JSON.stringify({ memberId: id }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) return body?.error ?? 'Could not remove that member.';

        setMembers((current) => current.filter((member) => member.id !== id));
        return null;
    }, []);

    return (
        <MembersContext.Provider
            value={{
                members,
                loading,
                addMember,
                editMember,
                removeMember,
                setRole,
                revokeAccess,
                removeFromFamily,
            }}>
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
