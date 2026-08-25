import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFamily } from '@/hooks/use-family';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
    const theme = useTheme();
    const { createFamily } = useFamily();

    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const canSubmit = name.trim().length > 0;

    const create = async () => {
        if (!canSubmit || pending) return;
        setPending(true);
        setError(null);

        const message = await createFamily(name.trim());

        setPending(false);
        if (message) setError(message);
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <ThemedText type="subtitle">Set up your family</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        Give it a name. You can add everyone else afterwards.
                    </ThemedText>

                    <View style={styles.form}>
                        <ThemedText type="default" style={styles.label}>
                            Family name
                        </ThemedText>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder="The Rossis"
                            placeholderTextColor={theme.textSecondary}
                            value={name}
                            onChangeText={setName}
                            onSubmitEditing={create}
                            accessibilityLabel="Family name"
                        />
                    </View>

                    {error && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {error}
                        </ThemedText>
                    )}

                    <Pressable
                        onPress={create}
                        disabled={!canSubmit || pending}
                        accessibilityLabel="Create family"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.submitButton,
                            {
                                backgroundColor:
                                    canSubmit && !pending
                                        ? theme.text
                                        : theme.backgroundElement,
                            },
                            pressed && { opacity: 0.8 },
                        ]}>
                        {pending ? (
                            <ActivityIndicator color={theme.textSecondary} />
                        ) : (
                            <ThemedText
                                style={[
                                    styles.submitButtonText,
                                    {
                                        color: canSubmit
                                            ? theme.background
                                            : theme.textSecondary,
                                    },
                                ]}>
                                Create family
                            </ThemedText>
                        )}
                    </Pressable>
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
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        gap: Spacing.two,
    },
    form: {
        gap: Spacing.two,
        paddingTop: Spacing.three,
    },
    label: {
        fontWeight: '600',
    },
    textInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
    },
    submitButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        padding: Spacing.three,
        marginTop: Spacing.two,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
