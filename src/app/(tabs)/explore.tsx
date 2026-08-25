import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyBar } from '@/components/family-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ExploreScreen() {
    const theme = useTheme();

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <FamilyBar />

                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.pageTitle}>
                        Other
                    </ThemedText>
                </View>

                <View style={styles.body}>
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: theme.backgroundElement },
                        ]}>
                        <SymbolView
                            name={{ ios: 'sparkles', web: 'auto_awesome' }}
                            tintColor={theme.textSecondary}
                            size={28}
                        />
                        <ThemedText
                            themeColor="textSecondary"
                            style={styles.text}>
                            Coming soon
                        </ThemedText>
                    </View>
                </View>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
        maxWidth: MaxContentWidth,
    },
    header: {
        paddingTop: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.two,
        gap: Spacing.one,
    },
    pageTitle: {
        fontSize: 34,
        lineHeight: 40,
    },
    body: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
    },
    card: {
        alignItems: 'center',
        gap: Spacing.two,
        borderRadius: 16,
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.four,
        alignSelf: 'stretch',
    },
    text: {
        textAlign: 'center',
    },
});
