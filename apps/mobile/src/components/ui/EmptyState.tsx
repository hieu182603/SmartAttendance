import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  emoji,
  title,
  description,
}) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <View style={s.iconContainer}>
        {icon ? (
          <Icon name={icon} size={40} color={colors.text.muted} />
        ) : emoji ? (
          <Text style={s.emoji}>{emoji}</Text>
        ) : (
          <Text style={s.emoji}>📭</Text>
        )}
      </View>
      <Text style={s.title}>{title}</Text>
      {description && <Text style={s.description}>{description}</Text>}
    </View>
  );
};

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.background.base,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emoji: {
      fontSize: 40,
    },
    title: {
      color: c.text.primary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    description: {
      color: c.text.muted,
      fontSize: 14,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
}
