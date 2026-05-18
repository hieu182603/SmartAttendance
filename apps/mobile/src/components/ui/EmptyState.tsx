import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../utils/styles';
import { Icon } from './Icon';

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
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {icon ? (
          <Icon name={icon} size={40} color={COLORS.text.secondary} />
        ) : emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Text style={styles.emoji}>📭</Text>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  description: {
    color: COLORS.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
  },
});
