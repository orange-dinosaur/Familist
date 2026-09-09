import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
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
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
    const theme = useTheme();
    const scheme = useColorScheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [unverified, setUnverified] = useState(false);
    const [pending, setPending] = useState(false);
    const [resent, setResent] = useState(false);

    const canSubmit = email.trim().length > 0 && password.length > 0;

    const signIn = async () => {
        if (!canSubmit || pending) return;
        setPending(true);
        setError(null);
        setUnverified(false);
        setResent(false);

        const { error: signInError } = await authClient.signIn.email({
            email: email.trim(),
            password,
        });

        setPending(false);

        if (signInError) {
            setUnverified(signInError.code === 'EMAIL_NOT_VERIFIED');
            setError(signInError.message ?? 'Could not sign in.');
            return;
        }

        router.replace('/');
    };

    const resendVerification = async () => {
        if (pending) return;
        setPending(true);
        setError(null);

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

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.head}>
                        <Image
                            source={
                                scheme === 'dark'
                                    ? require('@/assets/images/familist-lockup-verde.svg')
                                    : require('@/assets/images/familist-lockup-chiaro.svg')
                            }
                            style={styles.lockup}
                            contentFit="contain"
                            accessibilityLabel="FamiList"
                        />
                        <ThemedText type="heading" style={styles.tagline}>
                            One list for the whole house.
                        </ThemedText>
                    </View>

                    <View style={styles.form}>
                        <View
                            style={[
                                styles.field,
                                { borderBottomColor: `${theme.text}24` },
                            ]}>
                            <ThemedText type="label" themeColor="textSecondary">
                                Email
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    { color: theme.text },
                                ]}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                accessibilityLabel="Email"
                            />
                        </View>

                        <View
                            style={[
                                styles.field,
                                { borderBottomColor: `${theme.text}24` },
                            ]}>
                            <ThemedText type="label" themeColor="textSecondary">
                                Password
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    { color: theme.text },
                                ]}
                                placeholder="Your password"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoComplete="current-password"
                                secureTextEntry
                                onSubmitEditing={signIn}
                                accessibilityLabel="Password"
                            />
                        </View>
                    </View>

                    {error && (
                        <ThemedText
                            type="small"
                            style={{ color: theme.destructive }}>
                            {error}
                        </ThemedText>
                    )}

                    {unverified && !resent && (
                        <Pressable
                            onPress={resendVerification}
                            accessibilityLabel="Resend the verification email"
                            accessibilityRole="button">
                            <ThemedText type="linkPrimary">
                                Send the verification email again
                            </ThemedText>
                        </Pressable>
                    )}

                    {resent && (
                        <ThemedText type="small" themeColor="textSecondary">
                            Sent. Check your inbox, then sign in again.
                        </ThemedText>
                    )}

                    <Pressable
                        onPress={signIn}
                        disabled={!canSubmit || pending}
                        accessibilityLabel="Sign in"
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
                                type="smallBold"
                                style={{
                                    color: canSubmit
                                        ? theme.background
                                        : theme.textSecondary,
                                }}>
                                Sign in
                            </ThemedText>
                        )}
                    </Pressable>

                    <View style={styles.spacer} />

                    <View
                        style={[
                            styles.footer,
                            { borderTopColor: `${theme.text}24` },
                        ]}>
                        <ThemedText type="small" themeColor="textSecondary">
                            New here?
                        </ThemedText>
                        <Link href="/signup" asChild>
                            <Pressable
                                accessibilityLabel="Create an account"
                                accessibilityRole="button">
                                <ThemedText type="smallBold">
                                    Create a family
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
        paddingHorizontal: Spacing.four,
        gap: Spacing.two,
    },
    head: {
        paddingTop: Spacing.five,
        gap: Spacing.four,
    },
    /** The lockup's artwork is 168 by 37, and it is drawn at its own size. */
    lockup: {
        width: 168,
        height: 37,
    },
    tagline: {
        maxWidth: 250,
    },
    form: {
        paddingTop: Spacing.five,
    },
    field: {
        gap: Spacing.two,
        paddingBottom: Spacing.two,
        marginBottom: Spacing.four,
        borderBottomWidth: 1,
    },
    textInput: {
        fontFamily: Fonts.sansMedium,
        fontSize: 16,
        paddingVertical: Spacing.one,
    },
    submitButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: Spacing.three,
        marginTop: Spacing.two,
    },
    spacer: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.three,
        borderTopWidth: 1,
    },
});
