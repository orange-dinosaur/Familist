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
import { ChoreDefinitionsProvider } from '@/hooks/use-chore-definitions';
import { ChoresProvider } from '@/hooks/use-chores';
import { FamilyProvider } from '@/hooks/use-family';
import { MealProvider } from '@/hooks/use-meals';
import { MembersProvider } from '@/hooks/use-members';
import { TodosProvider } from '@/hooks/use-todos';

/**
 * The guard reads the family as well as the session, so it has to sit inside
 * the provider that supplies it.
 */
function Guarded({ children }: { children: React.ReactNode }) {
    useAuthGuard();
    return children;
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <FamilyProvider>
                    <MembersProvider>
                        <MealProvider>
                            <ChoreDefinitionsProvider>
                                <ChoresProvider>
                                    <TodosProvider>
                                        <Guarded>
                                            <AnimatedSplashOverlay />
                                            <Stack
                                                screenOptions={{
                                                    headerShown: false,
                                                }}
                                            />
                                        </Guarded>
                                    </TodosProvider>
                                </ChoresProvider>
                            </ChoreDefinitionsProvider>
                        </MealProvider>
                    </MembersProvider>
                </FamilyProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
