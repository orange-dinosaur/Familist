import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

import { apiFetch, authClient } from '@/auth/client';
import { type MemberRole } from '@/utils/member';

export interface Family {
    id: string;
    name: string;
}

export interface Membership {
    id: string;
    role: MemberRole;
}

interface FamilyContextValue {
    family: Family | null;
    member: Membership | null;
    /** True until the first answer arrives, so nothing acts on a missing family too early. */
    loading: boolean;
    createFamily: (name: string) => Promise<string | null>;
    joinFamily: (code: string) => Promise<string | null>;
    /** Owner only; answers with the reason it did not work, or null. */
    renameFamily: (name: string) => Promise<string | null>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = authClient.useSession();
    const [family, setFamily] = useState<Family | null>(null);
    const [member, setMember] = useState<Membership | null>(null);
    const [loading, setLoading] = useState(true);

    const userId = session?.user.id ?? null;

    useEffect(() => {
        if (isPending) return;

        if (!userId) {
            setFamily(null);
            setMember(null);
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);

        apiFetch('/api/family')
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!active) return;
                setFamily(body?.family ?? null);
                setMember(body?.member ?? null);
            })
            .catch(() => {
                if (!active) return;
                setFamily(null);
                setMember(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [userId, isPending]);

    const createFamily = useCallback(async (name: string) => {
        const res = await apiFetch('/api/family', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            return body?.error ?? 'Could not create the family.';
        }

        setFamily(body.family);
        setMember(body.member);
        return null;
    }, []);

    const joinFamily = useCallback(async (code: string) => {
        const res = await apiFetch('/api/invitations/accept', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            return body?.error ?? 'Could not join the family.';
        }

        setFamily(body.family);
        setMember(body.member);
        return null;
    }, []);

    const renameFamily = useCallback(async (name: string) => {
        const res = await apiFetch('/api/family', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            return body?.error ?? 'Could not rename the family.';
        }

        setFamily(body.family);
        return null;
    }, []);

    return (
        <FamilyContext.Provider
            value={{
                family,
                member,
                loading,
                createFamily,
                joinFamily,
                renameFamily,
            }}>
            {children}
        </FamilyContext.Provider>
    );
}

export function useFamily(): FamilyContextValue {
    const context = useContext(FamilyContext);
    if (!context) {
        throw new Error('useFamily must be used within a FamilyProvider');
    }
    return context;
}
