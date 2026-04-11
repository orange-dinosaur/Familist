import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

    return (
        <NativeTabs
            backgroundColor={colors.background}
            indicatorColor={colors.backgroundElement}
            labelStyle={{ selected: { color: colors.text } }}>
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    src={require('@/assets/images/tabIcons/home.png')}
                    renderingMode="template"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="daily-meal">
                <NativeTabs.Trigger.Label>Daily Meal</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf="fork.knife"
                    renderingMode="template"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="daily-chores">
                <NativeTabs.Trigger.Label>
                    Daily Chores
                </NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf="washer.fill"
                    renderingMode="template"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="todo">
                <NativeTabs.Trigger.Label>To-Do</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    sf="checklist"
                    renderingMode="template"
                />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="explore">
                <NativeTabs.Trigger.Label>Other</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon
                    src={require('@/assets/images/tabIcons/explore.png')}
                    renderingMode="template"
                />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
