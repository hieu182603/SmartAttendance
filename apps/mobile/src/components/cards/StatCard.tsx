import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../utils/styles';
import { Icon } from '../ui/Icon';

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  unit: string;
  color: 'success' | 'primary' | 'warning' | 'destructive';
  delay?: number;
}

const colorConfig = {
  success: {
    gradient: ['rgba(11, 218, 104, 0.2)', 'rgba(11, 218, 104, 0.1)'],
    iconColor: COLORS.accent.green,
    textColor: COLORS.accent.green,
  },
  primary: {
    gradient: ['rgba(66, 69, 240, 0.2)', 'rgba(66, 69, 240, 0.1)'],
    iconColor: COLORS.primary,
    textColor: COLORS.primary,
  },
  warning: {
    gradient: ['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.1)'],
    iconColor: '#FF9800',
    textColor: '#FF9800',
  },
  destructive: {
    gradient: ['rgba(244, 67, 54, 0.2)', 'rgba(244, 67, 54, 0.1)'],
    iconColor: COLORS.accent.red,
    textColor: COLORS.accent.red,
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  unit,
  color,
  delay = 0,
}) => {
  const colors = colorConfig[color];

  return (
    <View
      style={[
        styles.card,
        {
          opacity: delay > 0 ? 0 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={colors.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Icon name={icon} size={20} color={colors.iconColor} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: colors.textColor }]}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface.dark,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    ...SHADOWS.md,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text.secondary,
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  unit: {
    color: COLORS.text.secondary,
    fontSize: 12,
  },
});
