import { Image } from 'expo-image';
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
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export default function SignupScreen() {
    const theme = useTheme();
    const scheme = useColorScheme();

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

    const lockup = (
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
    );

    /**
     * Sign-up reports success whether or not the mail actually went out, so
     * this screen offers to send it again rather than promising it arrived.
     */
    if (registered) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.content}>
                        <View style={styles.head}>
                            {lockup}
                            <ThemedText type="heading" style={styles.tagline}>
                                One more step
                            </ThemedText>
                        </View>

                        <View style={styles.message}>
                            <ThemedText type="small" themeColor="textSecondary">
                                We sent a verification link to {email.trim()}.
                                Open it to finish setting up your account, then
                                sign in.
                            </ThemedText>
                        </View>

                        {error && (
                            <ThemedText
                                type="small"
                                style={{ color: theme.destructive }}>
                                {error}
                            </ThemedText>
                        )}

                        {resent ? (
                            <ThemedText type="small" themeColor="textSecondary">
                                Sent again. Check your inbox.
                            </ThemedText>
                        ) : (
                            <Pressable
                                onPress={resendVerification}
                                accessibilityLabel="Resend the verification email"
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.submitButton,
                                    {
                                        backgroundColor: pending
                                            ? theme.backgroundElement
                                            : theme.text,
                                    },
                                    pressed && { opacity: 0.8 },
                                ]}>
                                {pending ? (
                                    <ActivityIndicator
                                        color={theme.textSecondary}
                                    />
                                ) : (
                                    <ThemedText
                                        type="smallBold"
                                        style={{ color: theme.background }}>
                                        Send it again
                                    </ThemedText>
                                )}
                            </Pressable>
                        )}

                        <View style={styles.spacer} />

                        <View
                            style={[
                                styles.footer,
                                { borderTopColor: `${theme.text}24` },
                            ]}>
                            <ThemedText type="small" themeColor="textSecondary">
                                Already verified?
                            </ThemedText>
                            <Link href="/login" asChild>
                                <Pressable
                                    accessibilityLabel="Go to sign in"
                                    accessibilityRole="button">
                                    <ThemedText type="smallBold">
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

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.head}>
                        {lockup}
                        <ThemedText type="heading" style={styles.tagline}>
                            Your family&apos;s meals, chores and lists in one
                            place.
                        </ThemedText>
                    </View>

                    <View style={styles.form}>
                        <View
                            style={[
                                styles.field,
                                { borderBottomColor: `${theme.text}24` },
                            ]}>
                            <ThemedText type="label" themeColor="textSecondary">
                                Name
                            </ThemedText>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    { color: theme.text },
                                ]}
                                placeholder="How your family sees you"
                                placeholderTextColor={theme.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoComplete="name"
                                accessibilityLabel="Name"
                            />
                        </View>

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
                                placeholder="At least 8 characters"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoComplete="new-password"
                                secureTextEntry
                                onSubmitEditing={signUp}
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
                                type="smallBold"
                                style={{
                                    color: canSubmit
                                        ? theme.background
                                        : theme.textSecondary,
                                }}>
                                Create account
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
                            Already have an account?
                        </ThemedText>
                        <Link href="/login" asChild>
                            <Pressable
                                accessibilityLabel="Go to sign in"
                                accessibilityRole="button">
                                <ThemedText type="smallBold">
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
    message: {
        paddingTop: Spacing.five,
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
