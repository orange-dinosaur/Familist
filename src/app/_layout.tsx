import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ChoresProvider } from '@/hooks/use-chores';
import { MealProvider } from '@/hooks/use-meals';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <MealProvider>
                    <ChoresProvider>
                        <AnimatedSplashOverlay />
                        <AppTabs />
                    </ChoresProvider>
                </MealProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
