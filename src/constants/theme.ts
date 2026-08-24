/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
    light: {
        text: '#1F2A22',
        background: '#F6F1E7',
        backgroundElement: '#FBF8F1',
        backgroundSelected: '#D9CDB4',
        textSecondary: '#2F4436',
    },
    dark: {
        text: '#F1EADB',
        background: '#1F2A22',
        backgroundElement: '#2F4436',
        backgroundSelected: '#5C7360',
        textSecondary: '#A9BBA3',
    },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
    ios: {
        /** iOS `UIFontDescriptorSystemDesignDefault` */
        sans: 'system-ui',
        /** iOS `UIFontDescriptorSystemDesignSerif` */
        serif: 'ui-serif',
        /** iOS `UIFontDescriptorSystemDesignRounded` */
        rounded: 'ui-rounded',
        /** iOS `UIFontDescriptorSystemDesignMonospaced` */
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: 'var(--font-display)',
        serif: 'var(--font-serif)',
        rounded: 'var(--font-rounded)',
        mono: 'var(--font-mono)',
    },
});

export const Spacing = {
    half: 2,
    one: 4,
    two: 8,
    three: 16,
    four: 24,
    five: 32,
    six: 64,
} as const;

export const BottomTabInset =
    Platform.select({ ios: 50, android: 80, web: 54 }) ?? 0;
export const MaxContentWidth = 800;
