import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 9999, // Ensure it sits above other elements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  const insets = useSafeAreaInsets();
  
  return (
    <View
      style={[
        styles.toast,
        { top: Math.max(insets.top, 20) + 10 },
        type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};
