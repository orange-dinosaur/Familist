/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
    light: {
        text: '#2F2A27',
        background: '#F3EEE7',
        backgroundElement: '#FBF8F4',
        backgroundSelected: '#DED5C9',
        /** Dark in both schemes, so what sits on it reads from the dark palette. */
        dock: '#2F2A27',
        textSecondary: '#514A44',
        textMuted: '#736960',
        link: '#637058',
        destructive: '#A8452F',
        priorityHigh: '#A8452F',
        priorityMedium: '#B8693A',
        priorityLow: '#7C8C6E',
        // Darker than in dark mode so the cream initials on an avatar stay readable.
        memberSage: '#637058',
        memberWalnut: '#A05B32',
        memberPlum: '#A14A5A',
        memberSlate: '#84692A',
    },
    dark: {
        text: '#ECEAE2',
        background: '#171B17',
        backgroundElement: '#222822',
        backgroundSelected: '#343B33',
        dock: '#222822',
        textSecondary: '#C7C8BC',
        textMuted: '#A2A596',
        link: '#A3B592',
        destructive: '#E58A74',
        priorityHigh: '#E58A74',
        priorityMedium: '#E0A070',
        priorityLow: '#A3B592',
        memberSage: '#A3B592',
        memberWalnut: '#E0A070',
        memberPlum: '#B35F6D',
        memberSlate: '#D9BE6E',
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
