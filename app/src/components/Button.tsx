import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../constants';

interface ButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium';
  children: string;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: 10,
    backgroundColor: theme.accent,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgTertiary,
  },
  small: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
    fontSize: 15,
    color: theme.textPrimary,
  },
  smallText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export const Button: React.FC<ButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  children,
  style,
}) => {
  const variantStyle = variant === 'primary' ? styles.primary : styles.secondary;
  const sizeStyle = size === 'small' ? styles.small : {};
  const textStyle: TextStyle = {
    ...styles.text,
    ...(size === 'small' && styles.smallText),
  };

  return (
    <TouchableOpacity
      style={[
        variantStyle,
        sizeStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={theme.textPrimary} />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};
