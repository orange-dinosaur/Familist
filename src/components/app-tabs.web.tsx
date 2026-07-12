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
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type TabButtonProps = TabTriggerSlotProps & {
    icon?: string;
};

export default function AppTabs() {
    return (
        <Tabs>
            <TabSlot style={{ height: '100%' }} />
            <TabList asChild>
                <CustomTabList>
                    <TabTrigger name="home" href="/" asChild>
                        <TabButton icon="house">Home</TabButton>
                    </TabTrigger>
                    <TabTrigger name="explore" href="/explore" asChild>
                        <TabButton icon="search">Explore</TabButton>
                    </TabTrigger>
                    <TabTrigger name="daily-meal" href="/daily-meal" asChild>
                        <TabButton icon="restaurant">Daily Meal</TabButton>
                    </TabTrigger>
                    <TabTrigger
                        name="daily-chores"
                        href="/daily-chores"
                        asChild>
                        <TabButton icon="home">Daily Chores</TabButton>
                    </TabTrigger>
                    <TabTrigger name="todo" href="/todo" asChild>
                        <TabButton icon="checklist">To-Do</TabButton>
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
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
    const tintColor = isFocused ? colors.text : colors.textSecondary;

    return (
        <Pressable
            {...props}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
                type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.tabButtonView}>
                {icon && (
                    <SymbolView
                        name={{ web: icon as any }}
                        tintColor={tintColor}
                        size={14}
                    />
                )}
                <ThemedText
                    type="small"
                    themeColor={isFocused ? 'text' : 'textSecondary'}>
                    {children}
                </ThemedText>
            </ThemedView>
        </Pressable>
    );
}

export function CustomTabList(props: TabListProps) {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

    return (
        <View {...props} style={styles.tabListContainer}>
            <ThemedView type="backgroundElement" style={styles.innerContainer}>
                <ThemedText type="smallBold" style={styles.brandText}>
                    Expo Starter
                </ThemedText>

                {props.children}

                <ExternalLink href="https://docs.expo.dev" asChild>
                    <Pressable style={styles.externalPressable}>
                        <ThemedText type="link">Docs</ThemedText>
                        <SymbolView
                            tintColor={colors.text}
                            name={{ ios: 'arrow.up.right.square', web: 'link' }}
                            size={12}
                        />
                    </Pressable>
                </ExternalLink>
            </ThemedView>
        </View>
    );
}

const styles = StyleSheet.create({
    tabListContainer: {
        position: 'absolute',
        width: '100%',
        padding: Spacing.three,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    innerContainer: {
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.five,
        borderRadius: Spacing.five,
        flexDirection: 'row',
        alignItems: 'center',
        flexGrow: 1,
        gap: Spacing.two,
        maxWidth: MaxContentWidth,
    },
    brandText: {
        marginRight: 'auto',
    },
    pressed: {
        opacity: 0.7,
    },
    tabButtonView: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: Spacing.three,
    },
    externalPressable: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.one,
        marginLeft: Spacing.three,
    },
});
