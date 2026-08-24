/**
 * Identifiers for stored entities.
 */

export function createId(): string {
    const chunk = () => Math.random().toString(36).slice(2).padEnd(8, '0');
    return `${Date.now().toString(36)}-${chunk()}-${chunk()}`;
}
