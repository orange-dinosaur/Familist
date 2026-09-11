import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

interface ChoiceCardProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * A card that rises from the foot of the screen over a blur, for picking one
 * thing from a list. Tapping outside it closes it, as the ✕ does.
 */
export function ChoiceCard({
    visible,
    title,
    onClose,
    children,
}: ChoiceCardProps) {
    const theme = useTheme();
    const scheme = useColorScheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}>
            <BlurView
                intensity={40}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={[
                    styles.overlay,
                    { backgroundColor: `${theme.text}29` },
                ]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                />
                <View
                    style={[
                        styles.card,
                        { backgroundColor: theme.background },
                    ]}>
                    <View style={styles.header}>
                        <ThemedText type="heading">{title}</ThemedText>
                        <Pressable
                            onPress={onClose}
                            hitSlop={8}
                            accessibilityLabel="Close"
                            accessibilityRole="button">
                            <SymbolView
                                name={{ ios: 'xmark', web: 'close' }}
                                tintColor={theme.textSecondary}
                                size={16}
                            />
                        </Pressable>
                    </View>
                    <ScrollView
                        style={styles.body}
                        showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: Spacing.four,
        gap: Spacing.three,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    body: {
        maxHeight: 360,
    },
});
