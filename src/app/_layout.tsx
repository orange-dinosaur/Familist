import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppearanceProvider, useAppearance } from '@/hooks/use-appearance';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

/**
 * Held until the faces and the appearance choice are both ready, so nothing is
 * ever painted in the system font, or in the wrong scheme, and then redone.
 */
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    return (
        <AppearanceProvider>
            <Root />
        </AppearanceProvider>
    );
}

function Root() {
    const colorScheme = useColorScheme();
    const { ready } = useAppearance();
    const [fontsLoaded] = useFonts({
        'Newsreader-Regular': require('@/assets/fonts/Newsreader-Regular.ttf'),
        'Newsreader-Italic': require('@/assets/fonts/Newsreader-Italic.ttf'),
        'Newsreader-SemiBold': require('@/assets/fonts/Newsreader-SemiBold.ttf'),
        'SplineSans-Regular': require('@/assets/fonts/SplineSans-Regular.ttf'),
        'SplineSans-Medium': require('@/assets/fonts/SplineSans-Medium.ttf'),
        'SplineSans-SemiBold': require('@/assets/fonts/SplineSans-SemiBold.ttf'),
        'SplineSans-Bold': require('@/assets/fonts/SplineSans-Bold.ttf'),
    });

    useEffect(() => {
        if (fontsLoaded && ready) SplashScreen.hideAsync();
    }, [fontsLoaded, ready]);

    if (!fontsLoaded || !ready) return null;

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
