import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../ui/Icon';

interface ManagerStatCardProps {
    icon: string;
    title: string;
    value: string | number;
    unit: string;
    color: 'success' | 'primary' | 'warning' | 'destructive' | 'info';
}

const colorConfig = {
    success: {
        gradient: ['#0BDA68', '#08A84E'],
        iconColor: '#ffffff',
        glowColor: 'rgba(11, 218, 104, 0.4)',
    },
    primary: {
        gradient: ['#4245F0', '#2E32C9'],
        iconColor: '#ffffff',
        glowColor: 'rgba(66, 69, 240, 0.4)',
    },
    warning: {
        gradient: ['#FF9800', '#F57C00'],
        iconColor: '#ffffff',
        glowColor: 'rgba(255, 152, 0, 0.4)',
    },
    destructive: {
        gradient: ['#F44336', '#D32F2F'],
        iconColor: '#ffffff',
        glowColor: 'rgba(244, 67, 54, 0.4)',
    },
    info: {
        gradient: ['#00BCD4', '#0097A7'],
        iconColor: '#ffffff',
        glowColor: 'rgba(0, 188, 212, 0.4)',
    }
};

export const ManagerStatCard: React.FC<ManagerStatCardProps> = ({
    icon,
    title,
    value,
    unit,
    color,
}) => {
    const colors = colorConfig[color];

    return (
        <View style={styles.cardContainer}>
            {/* Glow effect behind the card */}
            <View style={[styles.glow, { backgroundColor: colors.glowColor }]} />

            {/* Glassmorphism Card */}
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
                            colors={colors.gradient as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            <Icon name={icon} size={22} color={colors.iconColor} />
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
        borderRadius: BORDER_RADIUS.xl,
        top: 10,
        transform: [{ scale: 0.9 }],
        opacity: 0.6,
    },
    glassCard: {
        flex: 1,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 30, 50, 0.5)',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    iconWrapper: {
        padding: 2,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
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
