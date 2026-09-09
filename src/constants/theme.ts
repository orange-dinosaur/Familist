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
        /** Darker than the page in both schemes, so the dock reads as floating. */
        dock: '#1F2A22',
        textSecondary: '#2F4436',
        textMuted: '#5B6A59',
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
        dock: '#0F1712',
        textSecondary: '#A9BBA3',
        textMuted: '#7E8F7C',
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

/**
 * Each weight is its own family, because that is the only thing React Native
 * reads reliably on every platform - `fontWeight` against a single family is
 * honoured on iOS and ignored on Android.
 *
 * The monospace is deliberately not bundled: it carries the small-caps section
 * labels, and there the platform's own is the right one.
 */
export const Fonts = {
    sans: 'SplineSans-Regular',
    sansMedium: 'SplineSans-Medium',
    sansSemiBold: 'SplineSans-SemiBold',
    sansBold: 'SplineSans-Bold',
    serif: 'Newsreader-Regular',
    serifItalic: 'Newsreader-Italic',
    serifSemiBold: 'Newsreader-SemiBold',
    mono:
        Platform.select({
            ios: 'ui-monospace',
            default: 'monospace',
            web: 'var(--font-mono)',
        }) ?? 'monospace',
} as const;

export const Spacing = {
    half: 2,
    one: 4,
    two: 8,
    three: 16,
    four: 24,
    five: 32,
    six: 64,
} as const;

/**
 * What the dock covers: the 14 above it, the 66 of the pill itself, and the 26
 * it sits off the bottom. One number rather than three, now that the same dock
 * is on every platform.
 */
export const BottomTabInset = 106;
/** The dock keeps a phone's proportions however wide the window gets. */
export const DockMaxWidth = 390;
export const MaxContentWidth = 800;
