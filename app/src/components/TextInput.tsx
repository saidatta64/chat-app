import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { theme } from '../constants';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.textPrimary,
    fontSize: 15,
    backgroundColor: theme.bgTertiary,
  },
  inputError: {
    borderColor: theme.error,
  },
  errorText: {
    color: theme.error,
    fontSize: 12,
    marginTop: 4,
  },
});

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, !label && { marginBottom: 0 }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        {...props}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
