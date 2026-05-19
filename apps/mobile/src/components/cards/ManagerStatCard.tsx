import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme';

interface ManagerStatCardProps {
    icon: string;
    title: string;
    value: string | number;
    unit: string;
    color: 'success' | 'primary' | 'warning' | 'destructive' | 'info';
}

export const ManagerStatCard: React.FC<ManagerStatCardProps> = ({
    icon,
    title,
    value,
    unit,
    color,
}) => {
    const { colors } = useTheme();

    const colorConfig = useMemo(() => ({
        success: {
            gradient: [colors.brand.secondary, colors.status.success] as any,
            iconColor: colors.text.onPrimary,
            glowColor: 'rgba(11, 218, 104, 0.4)',
        },
        primary: {
            gradient: [colors.brand.primary, colors.brand.primaryActive] as any,
            iconColor: colors.text.onPrimary,
            glowColor: 'rgba(66, 69, 240, 0.4)',
        },
        warning: {
            gradient: ['#FF9800', '#F57C00'] as any,
            iconColor: colors.text.onPrimary,
            glowColor: 'rgba(255, 152, 0, 0.4)',
        },
        destructive: {
            gradient: [colors.status.danger, '#D32F2F'] as any,
            iconColor: colors.text.onPrimary,
            glowColor: 'rgba(244, 67, 54, 0.4)',
        },
        info: {
            gradient: ['#00BCD4', '#0097A7'] as any,
            iconColor: colors.text.onPrimary,
            glowColor: 'rgba(0, 188, 212, 0.4)',
        },
    }), [colors]);

    const cfg = colorConfig[color];

    return (
        <View style={styles.cardContainer}>
            <View style={[styles.glow, { backgroundColor: cfg.glowColor }]} />

            <View style={styles.glassCard}>
                <BlurView
                    intensity={40}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.content}>
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={cfg.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            <Icon name={icon} size={22} color={cfg.iconColor} />
                        </LinearGradient>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.value}>{value}</Text>
                        <Text style={styles.unit}>{unit}</Text>
                    </View>
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Icon name="arrow_forward_ios" size={10} color="rgba(255,255,255,0.3)" />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        position: 'relative',
        height: 120,
    },
    glow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        top: 10,
        transform: [{ scale: 0.9 }],
        opacity: 0.6,
    },
    glassCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 30, 50, 0.5)',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 8,
    },
    iconWrapper: {
        padding: 2,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    unit: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        marginTop: -2,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '600',
    },
});
