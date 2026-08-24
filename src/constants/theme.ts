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
        link: '#6B4F3A',
        destructive: '#A63D2F',
        priorityHigh: '#A63D2F',
        priorityMedium: '#A86A18',
        priorityLow: '#4E7A3C',
        memberSage: '#4E6B49',
        memberWalnut: '#6B4F3A',
        memberPlum: '#6B3A52',
        memberSlate: '#3E5C6B',
    },
    dark: {
        text: '#F1EADB',
        background: '#1F2A22',
        backgroundElement: '#2F4436',
        backgroundSelected: '#5C7360',
        textSecondary: '#A9BBA3',
        link: '#C9A279',
        destructive: '#A63D2F',
        priorityHigh: '#E88A7D',
        priorityMedium: '#D9A441',
        priorityLow: '#8FBF6F',
        memberSage: '#A9BBA3',
        memberWalnut: '#C9A279',
        memberPlum: '#C89BB0',
        memberSlate: '#9FBBC8',
    },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export type MemberColor =
    | 'memberSage'
    | 'memberWalnut'
    | 'memberPlum'
    | 'memberSlate';

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
