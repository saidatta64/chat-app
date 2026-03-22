import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants';
import { commonStyles } from '../styles/common';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastError: {
    backgroundColor: theme.errorBg,
  },
  toastSuccess: {
    backgroundColor: theme.successBg,
  },
  toastText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
});

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  return (
    <View
      style={[
        styles.toast,
        type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};
