/**
 * A person, as a circle: their picture if they have one, their initials if
 * they do not, and a generic figure where there is nobody at all.
 *
 * The same three cases were written out by hand at six sizes across the
 * screens, which is why the picture could not simply be added to one of them.
 */

import { Image } from 'expo-image';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { apiUrl } from '@/auth/client';
import { useTheme } from '@/hooks/use-theme';
import { type Member } from '@/utils/member';

interface MemberAvatarProps {
    /** Null is nobody: an unassigned task, or a person with no family yet. */
    member: Member | null;
    size: number;
    /** What stands for nobody. The bar's account button asks for its own. */
    icon?: { ios: SFSymbol; web: AndroidSymbol };
}

const NOBODY = {
    ios: 'person.crop.circle',
    web: 'person_outline',
} as const;

export function MemberAvatar({ member, size, icon }: MemberAvatarProps) {
    const theme = useTheme();

    const circle = {
        width: size,
        height: size,
        borderRadius: size / 2,
    };

    if (!member) {
        return (
            <View
                style={[
                    styles.circle,
                    circle,
                    { backgroundColor: theme.backgroundSelected },
                ]}>
                <SymbolView
                    name={icon ?? NOBODY}
                    tintColor={theme.textSecondary}
                    size={Math.round(size * 0.5)}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.circle,
                circle,
                { backgroundColor: theme[member.color] },
            ]}>
            {/* Under the picture, so a slow load shows the person rather than a hole. */}
            <ThemedText
                themeColor="background"
                style={{
                    fontSize: Math.round(size * 0.42),
                    fontWeight: '700',
                }}>
                {member.initials}
            </ThemedText>
            {member.image && (
                <Image
                    source={{ uri: apiUrl(member.image) }}
                    style={[StyleSheet.absoluteFill, circle]}
                    contentFit="cover"
                    accessibilityLabel={member.name}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});
