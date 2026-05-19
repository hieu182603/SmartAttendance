import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme';

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  unit: string;
  color: 'success' | 'primary' | 'warning' | 'destructive';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  unit,
  color,
  delay = 0,
}) => {
  const { colors } = useTheme();

  const colorConfig = useMemo(() => ({
    success: {
      gradient: ['rgba(22,163,74,0.15)', 'rgba(22,163,74,0.08)'],
      iconColor: colors.status.success,
      textColor: colors.status.success,
    },
    primary: {
      gradient: ['rgba(79,110,247,0.2)', 'rgba(79,110,247,0.1)'],
      iconColor: colors.brand.primary,
      textColor: colors.brand.primary,
    },
    warning: {
      gradient: ['rgba(217,119,6,0.15)', 'rgba(217,119,6,0.08)'],
      iconColor: colors.status.warning,
      textColor: colors.status.warning,
    },
    destructive: {
      gradient: ['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.08)'],
      iconColor: colors.status.danger,
      textColor: colors.status.danger,
    },
  }), [colors]);

  const s = useMemo(() => makeStyles(colors), [colors]);
  const cfg = colorConfig[color];

  return (
    <View style={[s.card, delay > 0 && { opacity: 0 }]}>
      <LinearGradient
        colors={cfg.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.iconContainer}
      >
        <Icon name={icon} size={20} color={cfg.iconColor} />
      </LinearGradient>
      <Text style={s.title}>{title}</Text>
      <Text style={[s.value, { color: cfg.textColor }]}>{value}</Text>
      <Text style={s.unit}>{unit}</Text>
    </View>
  );
};

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.background.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border.default,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      alignItems: 'center',
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      color: c.text.muted,
      fontSize: 12,
      marginBottom: 4,
    },
    value: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    unit: {
      color: c.text.muted,
      fontSize: 12,
    },
  });
}
