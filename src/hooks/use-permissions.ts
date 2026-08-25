import { useFamily } from '@/hooks/use-family';

/**
 * The client half of the content routes' role rules. The server decides every
 * request on its own - this only answers which affordances are worth showing,
 * so a checker is never handed a control that would come back 403.
 *
 * Both answers are false until the membership arrives, which is the safe way
 * round: an affordance that appears a moment late is better than one that
 * appears and then fails.
 */
export function usePermissions() {
    const { member } = useFamily();
    const role = member?.role ?? null;
    const canManageContent = role === 'owner' || role === 'editor';

    return {
        /** Creating, editing, deleting and assigning: owners and editors. */
        canManageContent,

        /**
         * Ticking something off. A checker may only touch what is assigned to
         * them, which is the one rule the routes fold into the `WHERE` clause.
         */
        canToggle: (assigneeId?: string) =>
            role === 'checker' ? assigneeId === member?.id : canManageContent,
    };
}
