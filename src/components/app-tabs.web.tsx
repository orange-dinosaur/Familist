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
import { ThemedView } from './themed-view';

import { type PlatformSymbol } from '@/constants/mock-data';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabButtonProps = TabTriggerSlotProps & {
    icon: PlatformSymbol;
};

export default function AppTabs() {
    return (
        <Tabs>
            <TabSlot style={styles.tabSlot} />
            <TabList asChild>
                <CustomTabList>
                    <TabTrigger name="index" href="/" asChild>
                        <TabButton icon={{ ios: 'house.fill', web: 'home' }}>
                            Home
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="daily-meal" href="/daily-meal" asChild>
                        <TabButton
                            icon={{ ios: 'fork.knife', web: 'restaurant' }}>
                            Daily Meal
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
                            Daily Chores
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="todo" href="/todo" asChild>
                        <TabButton
                            icon={{ ios: 'checklist', web: 'checklist' }}>
                            To-Do
                        </TabButton>
                    </TabTrigger>
                    <TabTrigger name="explore" href="/explore" asChild>
                        <TabButton
                            icon={{
                                ios: 'rectangle.stack.fill',
                                web: 'layers',
                            }}>
                            Other
                        </TabButton>
                    </TabTrigger>
                </CustomTabList>
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
    const theme = useTheme();
    const tintColor = isFocused ? theme.text : theme.textSecondary;

    return (
        <Pressable
            {...props}
            style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.pressed,
            ]}>
            <SymbolView name={icon} tintColor={tintColor} size={22} />
            <ThemedText
                type="small"
                numberOfLines={1}
                themeColor={isFocused ? 'text' : 'textSecondary'}
                style={styles.tabLabel}>
                {children}
            </ThemedText>
        </Pressable>
    );
}

export function CustomTabList(props: TabListProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View {...props} style={styles.tabListContainer}>
            <ThemedView
                style={[
                    styles.innerContainer,
                    {
                        borderTopColor: theme.backgroundSelected,
                        paddingBottom: Spacing.two + insets.bottom,
                    },
                ]}>
                {props.children}
            </ThemedView>
        </View>
    );
}

const styles = StyleSheet.create({
    tabSlot: {
        height: '100%',
    },
    tabListContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
    },
    innerContainer: {
        width: '100%',
        maxWidth: MaxContentWidth,
        flexDirection: 'row',
        alignItems: 'stretch',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: Spacing.two,
    },

    // Tab button
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.half,
        paddingHorizontal: Spacing.half,
    },
    tabLabel: {
        fontSize: 11,
        lineHeight: 14,
    },
    pressed: {
        opacity: 0.7,
    },
});
