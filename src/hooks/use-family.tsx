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

/** One of the families the signed-in person belongs to. */
export interface FamilyOption {
    id: string;
    name: string;
    role: MemberRole;
}

interface FamilyContextValue {
    family: Family | null;
    member: Membership | null;
    /** Every family the caller belongs to, oldest membership first. */
    families: FamilyOption[];
    /** True until the first answer arrives, so nothing acts on a missing family too early. */
    loading: boolean;
    createFamily: (name: string) => Promise<string | null>;
    joinFamily: (code: string) => Promise<string | null>;
    /** Owner only; answers with the reason it did not work, or null. */
    renameFamily: (name: string) => Promise<string | null>;
    switchFamily: (familyId: string) => Promise<string | null>;
    leaveFamily: () => Promise<string | null>;
    /** Only for a family the caller owns and nobody else has an account in. */
    deleteFamily: () => Promise<string | null>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = authClient.useSession();
    const [family, setFamily] = useState<Family | null>(null);
    const [member, setMember] = useState<Membership | null>(null);
    const [families, setFamilies] = useState<FamilyOption[]>([]);
    const [loading, setLoading] = useState(true);

    const userId = session?.user.id ?? null;

    useEffect(() => {
        if (isPending) return;

        if (!userId) {
            setFamily(null);
            setMember(null);
            setFamilies([]);
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
                setFamilies(body?.families ?? []);
            })
            .catch(() => {
                if (!active) return;
                setFamily(null);
                setMember(null);
                setFamilies([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [userId, isPending]);

    /**
     * Appended, matching the server's order: oldest membership first. An id
     * already held is the same family arriving twice rather than a new one -
     * the server refuses a second membership in the same family - so it
     * replaces what is there instead of joining it.
     */
    const remember = useCallback((option: FamilyOption) => {
        setFamilies((current) =>
            current.some((held) => held.id === option.id)
                ? current.map((held) => (held.id === option.id ? option : held))
                : [...current, option]
        );
    }, []);

    const createFamily = useCallback(
        async (name: string) => {
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
            remember({ ...body.family, role: body.member.role });
            return null;
        },
        [remember]
    );

    const joinFamily = useCallback(
        async (code: string) => {
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
            remember({ ...body.family, role: body.member.role });
            return null;
        },
        [remember]
    );

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
        setFamilies((current) =>
            current.map((option) =>
                option.id === body.family.id
                    ? { ...option, name: body.family.name }
                    : option
            )
        );
        return null;
    }, []);

    /**
     * The server holds which family the caller is acting in, so this only has
     * to tell it and take the answer. Every store on the client is keyed by
     * the family id, so the collections rebuild themselves from there.
     */
    const switchFamily = useCallback(async (familyId: string) => {
        const res = await apiFetch('/api/family/switch', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ familyId }),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            return body?.error ?? 'Could not switch family.';
        }

        setFamily(body.family);
        setMember(body.member);
        return null;
    }, []);

    /**
     * Both answer with where the caller has landed - their next family, or
     * nothing at all, which is the same signal the first load gives and which
     * the guard already reads as "onboard this person".
     */
    const departure = useCallback(
        async (path: string, method: string, fallback: string) => {
            const leaving = family?.id;
            const res = await apiFetch(path, { method });
            const body = await res.json().catch(() => null);

            if (!res.ok) return body?.error ?? fallback;

            setFamily(body.family ?? null);
            setMember(body.member ?? null);
            setFamilies((current) =>
                current.filter((option) => option.id !== leaving)
            );
            return null;
        },
        [family?.id]
    );

    const leaveFamily = useCallback(
        () =>
            departure(
                '/api/family/leave',
                'POST',
                'Could not leave the family.'
            ),
        [departure]
    );

    const deleteFamily = useCallback(
        () =>
            departure(
                '/api/family/leave',
                'DELETE',
                'Could not delete the family.'
            ),
        [departure]
    );

    return (
        <FamilyContext.Provider
            value={{
                family,
                member,
                families,
                loading,
                createFamily,
                joinFamily,
                renameFamily,
                switchFamily,
                leaveFamily,
                deleteFamily,
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
