import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { ChoresProvider } from '@/hooks/use-chores';
import { MealProvider } from '@/hooks/use-meals';
import { MembersProvider } from '@/hooks/use-members';
import { TodosProvider } from '@/hooks/use-todos';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    useAuthGuard();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <MembersProvider>
                    <MealProvider>
                        <ChoresProvider>
                            <TodosProvider>
                                <AnimatedSplashOverlay />
                                <Stack screenOptions={{ headerShown: false }} />
                            </TodosProvider>
                        </ChoresProvider>
                    </MealProvider>
                </MembersProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
