import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants';

interface SheetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.bgHover,
    marginBottom: 10,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: 14,
  },
});

export const Sheet: React.FC<SheetProps> = ({ title, subtitle, children }) => {
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
};
