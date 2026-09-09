import {
    Tabs,
    TabList,
    TabTrigger,
    TabSlot,
    TabTriggerSlotProps,
    TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Colors, DockMaxWidth } from '@/constants/theme';
import { type PlatformSymbol } from '@/constants/types';
import { useTheme } from '@/hooks/use-theme';

/**
 * The dock is dark whichever scheme the app is in, so what sits on it is pinned
 * to the dark palette rather than following the theme.
 */
const active = Colors.dark.text;
const inactive = `${Colors.dark.textSecondary}B3`;
const activeBackground = `${Colors.dark.text}24`;

type TabButtonProps = TabTriggerSlotProps & {
    icon: PlatformSymbol;
};

export default function AppTabs() {
    return (
        <Tabs>
            <TabSlot style={styles.tabSlot} />
            <TabList asChild>
                <Dock>
                    <TabTrigger name="index" href="/" asChild>
                        <TabButton icon={{ ios: 'house.fill', web: 'home' }}>
                            Home
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="daily-meal" href="/daily-meal" asChild>
                        <TabButton
                            icon={{ ios: 'fork.knife', web: 'restaurant' }}>
                            Meals
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger
                        name="daily-chores"
                        href="/daily-chores"
                        asChild>
                        <TabButton
                            icon={{
                                ios: 'washer.fill',
                                web: 'local_laundry_service',
                            }}>
                            Chores
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="todo" href="/todo" asChild>
                        <TabButton
                            icon={{ ios: 'checklist', web: 'checklist' }}>
                            To-do
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="other" href="/other" asChild>
                        <TabButton
                            icon={{
                                ios: 'rectangle.stack.fill',
                                web: 'layers',
                            }}>
                            Other
                        </TabButton>
                    </TabTrigger>
                </Dock>
            </TabList>
        </Tabs>
    );
}

export function TabButton({
    children,
    isFocused,
    icon,
    ...props
}: TabButtonProps) {
    return (
        <Pressable
            {...props}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={
                typeof children === 'string' ? children : undefined
            }
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <View
                style={[
                    styles.iconBox,
                    isFocused && { backgroundColor: activeBackground },
                ]}>
                <SymbolView
                    name={icon}
                    tintColor={isFocused ? active : inactive}
                    size={18}
                />
            </View>
            <ThemedText
                type="labelSmall"
                numberOfLines={1}
                style={{ color: isFocused ? active : inactive }}>
                {children}
            </ThemedText>
        </Pressable>
    );
}

export function Dock(props: TabListProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            {...props}
            style={[
                styles.wrapper,
                { paddingBottom: Math.max(26, insets.bottom) },
            ]}>
            <View style={[styles.pill, { backgroundColor: theme.dock }]}>
                {props.children}
            </View>
        </View>
    );
}

/**
 * The pill's own geometry is written out rather than taken from `Spacing`: a
 * corner radius and an icon's box are not the page's rhythm, and bending them
 * onto the scale would only make the scale mean less.
 */
const styles = StyleSheet.create({
    tabSlot: {
        height: '100%',
    },
    wrapper: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        maxWidth: DockMaxWidth,
        alignSelf: 'center',
        paddingTop: 14,
        paddingHorizontal: 20,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 26,
        paddingVertical: 11,
        paddingHorizontal: 6,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        gap: 5,
    },
    iconBox: {
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 14,
    },
    pressed: {
        opacity: 0.7,
    },
});
