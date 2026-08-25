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

type Mode = 'create' | 'join';

export default function WelcomeScreen() {
    const theme = useTheme();
    const { createFamily, joinFamily } = useFamily();

    const [mode, setMode] = useState<Mode>('create');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const joining = mode === 'join';
    const canSubmit = joining ? code.trim().length > 0 : name.trim().length > 0;

    const submit = async () => {
        if (!canSubmit || pending) return;
        setPending(true);
        setError(null);

        const message = joining
            ? await joinFamily(code.trim())
            : await createFamily(name.trim());

        setPending(false);
        if (message) setError(message);
    };

    const switchMode = () => {
        if (pending) return;
        setMode(joining ? 'create' : 'join');
        setError(null);
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <ThemedText type="subtitle">
                        {joining ? 'Join your family' : 'Set up your family'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        {joining
                            ? 'Enter the code you were sent.'
                            : 'Give it a name. You can add everyone else afterwards.'}
                    </ThemedText>

                    <View style={styles.form}>
                        <ThemedText type="default" style={styles.label}>
                            {joining ? 'Invite code' : 'Family name'}
                        </ThemedText>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder={joining ? 'ABCD234XYZ' : 'The Rossis'}
                            placeholderTextColor={theme.textSecondary}
                            value={joining ? code : name}
                            onChangeText={joining ? setCode : setName}
                            autoCapitalize={
                                joining ? 'characters' : 'sentences'
                            }
                            autoCorrect={!joining}
                            onSubmitEditing={submit}
                            accessibilityLabel={
                                joining ? 'Invite code' : 'Family name'
                            }
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
                        onPress={submit}
                        disabled={!canSubmit || pending}
                        accessibilityLabel={
                            joining ? 'Join family' : 'Create family'
                        }
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
                                {joining ? 'Join family' : 'Create family'}
                            </ThemedText>
                        )}
                    </Pressable>

                    <View style={styles.footer}>
                        <ThemedText type="small" themeColor="textSecondary">
                            {joining
                                ? 'Starting fresh?'
                                : 'Got an invite code?'}
                        </ThemedText>
                        <Pressable
                            onPress={switchMode}
                            accessibilityLabel={
                                joining
                                    ? 'Create a family instead'
                                    : 'Join a family with a code'
                            }
                            accessibilityRole="button">
                            <ThemedText type="linkPrimary">
                                {joining ? 'Create a family' : 'Join a family'}
                            </ThemedText>
                        </Pressable>
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
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
    },
});
