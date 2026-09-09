import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
    type?:
        | 'default'
        | 'title'
        | 'heading'
        | 'small'
        | 'smallBold'
        | 'subtitle'
        | 'link'
        | 'linkPrimary'
        | 'code'
        | 'figureLarge'
        | 'figure'
        | 'figureSmall'
        | 'note'
        | 'label'
        | 'labelSmall';
    themeColor?: ThemeColor;
};

export function ThemedText({
    style,
    type = 'default',
    themeColor,
    ...rest
}: ThemedTextProps) {
    const theme = useTheme();

    return (
        <Text
            style={[
                { color: theme[themeColor ?? 'text'] },
                type === 'default' && styles.default,
                type === 'title' && styles.title,
                type === 'heading' && styles.heading,
                type === 'small' && styles.small,
                type === 'smallBold' && styles.smallBold,
                type === 'subtitle' && styles.subtitle,
                type === 'link' && styles.link,
                type === 'linkPrimary' && [
                    styles.linkPrimary,
                    { color: theme.link },
                ],
                type === 'code' && styles.code,
                type === 'figureLarge' && styles.figureLarge,
                type === 'figure' && styles.figure,
                type === 'figureSmall' && styles.figureSmall,
                type === 'note' && styles.note,
                type === 'label' && styles.label,
                type === 'labelSmall' && styles.labelSmall,
                style,
            ]}
            {...rest}
        />
    );
}

/**
 * The weight lives in the family name, so these never set `fontWeight` - asking
 * for one on top of a weighted face makes Android synthesise a second bold.
 */
const styles = StyleSheet.create({
    small: {
        fontFamily: Fonts.sansMedium,
        fontSize: 14,
        lineHeight: 20,
    },
    smallBold: {
        fontFamily: Fonts.sansBold,
        fontSize: 14,
        lineHeight: 20,
    },
    default: {
        fontFamily: Fonts.sansMedium,
        fontSize: 16,
        lineHeight: 24,
    },
    title: {
        fontFamily: Fonts.serif,
        fontSize: 40,
        lineHeight: 44,
    },
    /** What a sheet or a face calls itself, where a screen would use `title`. */
    heading: {
        fontFamily: Fonts.serif,
        fontSize: 30,
        lineHeight: 36,
    },
    subtitle: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 32,
        lineHeight: 44,
    },
    link: {
        fontFamily: Fonts.sans,
        lineHeight: 30,
        fontSize: 14,
    },
    linkPrimary: {
        fontFamily: Fonts.sans,
        lineHeight: 30,
        fontSize: 14,
    },
    code: {
        fontFamily: Fonts.mono,
        fontWeight: Platform.select({ android: 700 }) ?? 500,
        fontSize: 12,
    },
    /** A count or a total, the one figure a screen is built around. */
    figureLarge: {
        fontFamily: Fonts.serif,
        fontSize: 24,
        lineHeight: 28,
    },
    /** A date or an amount sitting inline in a row. */
    figure: {
        fontFamily: Fonts.serif,
        fontSize: 17,
        lineHeight: 22,
    },
    figureSmall: {
        fontFamily: Fonts.serif,
        fontSize: 15,
        lineHeight: 20,
    },
    /** What somebody wrote alongside a thing, rather than about it. */
    note: {
        fontFamily: Fonts.serifItalic,
        fontSize: 12.5,
        lineHeight: 17,
    },
    label: {
        fontFamily: Fonts.mono,
        fontWeight: 600,
        fontSize: 10,
        lineHeight: 12,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
    labelSmall: {
        fontFamily: Fonts.mono,
        fontWeight: 600,
        fontSize: 8.5,
        lineHeight: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});
