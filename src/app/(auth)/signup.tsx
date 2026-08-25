import { Link } from 'expo-router';
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
import { authClient, verificationCallbackURL } from '@/auth/client';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SignupScreen() {
    const theme = useTheme();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [resent, setResent] = useState(false);

    const canSubmit =
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length >= 8;

    const signUp = async () => {
        if (!canSubmit || pending) return;
        setPending(true);
        setError(null);

        const { error: signUpError } = await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: verificationCallbackURL,
        });

        setPending(false);

        if (signUpError) {
            setError(signUpError.message ?? 'Could not create the account.');
            return;
        }

        setRegistered(true);
    };

    const resendVerification = async () => {
        if (pending) return;
        setPending(true);
        setError(null);
        setResent(false);

        const { error: resendError } = await authClient.sendVerificationEmail({
            email: email.trim(),
            callbackURL: verificationCallbackURL,
        });

        setPending(false);

        if (resendError) {
            setError(resendError.message ?? 'Could not send the email.');
            return;
        }

        setResent(true);
    };

    /**
     * Sign-up reports success whether or not the mail actually went out, so
     * this screen offers to send it again rather than promising it arrived.
     */
    if (registered) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.content}>
                        <ThemedText type="subtitle">One more step</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                            We sent a verification link to {email.trim()}. Open
                            it to finish setting up your account, then sign in.
                        </ThemedText>

                        {error && (
                            <ThemedText
                                type="small"
                                style={{ color: theme.destructive }}>
                                {error}
                            </ThemedText>
                        )}

                        {resent ? (
                            <ThemedText type="small" themeColor="textSecondary">
                                Sent again.
                            </ThemedText>
                        ) : (
                            <Pressable
                                onPress={resendVerification}
                                accessibilityLabel="Resend the verification email"
                                accessibilityRole="button">
                                <ThemedText type="linkPrimary">
                                    Nothing arrived? Send it again
                                </ThemedText>
                            </Pressable>
                        )}

                        <View style={styles.footer}>
                            <Link href="/login" asChild>
                                <Pressable
                                    accessibilityLabel="Go to sign in"
                                    accessibilityRole="button">
                                    <ThemedText type="linkPrimary">
                                        Back to sign in
                                    </ThemedText>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                </SafeAreaView>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <ThemedText type="subtitle">Create an account</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                        Your family&apos;s meals, chores and lists in one place.
                    </ThemedText>

                    <View style={styles.form}>
                        <ThemedText type="default" style={styles.label}>
                            Name
                        </ThemedText>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder="How your family sees you"
                            placeholderTextColor={theme.textSecondary}
                            value={name}
                            onChangeText={setName}
                            autoComplete="name"
                            accessibilityLabel="Name"
                        />

                        <ThemedText type="default" style={styles.label}>
                            Email
                        </ThemedText>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder="you@example.com"
                            placeholderTextColor={theme.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            accessibilityLabel="Email"
                        />

                        <ThemedText type="default" style={styles.label}>
                            Password
                        </ThemedText>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    backgroundColor: theme.backgroundElement,
                                    color: theme.text,
                                },
                            ]}
                            placeholder="At least 8 characters"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            secureTextEntry
                            onSubmitEditing={signUp}
                            accessibilityLabel="Password"
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
                        onPress={signUp}
                        disabled={!canSubmit || pending}
                        accessibilityLabel="Create account"
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
                                Create account
                            </ThemedText>
                        )}
                    </Pressable>

                    <View style={styles.footer}>
                        <ThemedText type="small" themeColor="textSecondary">
                            Already have an account?
                        </ThemedText>
                        <Link href="/login" asChild>
                            <Pressable
                                accessibilityLabel="Go to sign in"
                                accessibilityRole="button">
                                <ThemedText type="linkPrimary">
                                    Sign in
                                </ThemedText>
                            </Pressable>
                        </Link>
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
