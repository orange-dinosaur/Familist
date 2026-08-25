/**
 * Identifiers for stored entities.
 */

export function createId(): string {
    const chunk = () => Math.random().toString(36).slice(2).padEnd(8, '0');
    return `${Date.now().toString(36)}-${chunk()}-${chunk()}`;
}

/**
 * Alphabet for codes people retype: no 0/O, 1/I/L, or U, which is the pair
 * most often misread from a handwritten note.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 10;

/**
 * An invitation code is a bearer credential - whoever holds it can join the
 * family - so unlike `createId` it must not come from `Math.random`.
 */
export function createInviteCode(): string {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);

    let code = '';
    for (const byte of bytes) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    return code;
}
