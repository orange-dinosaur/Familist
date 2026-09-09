import { useAppearance } from '@/hooks/use-appearance';

/**
 * The scheme to paint in, which is the person's choice resolved against the
 * device rather than the device on its own.
 */
export function useColorScheme(): 'light' | 'dark' {
    return useAppearance().scheme;
}
