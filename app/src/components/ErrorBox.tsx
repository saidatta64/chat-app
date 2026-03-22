import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants';

interface ErrorBoxProps {
  message: string;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.errorBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  text: {
    color: theme.error,
    fontSize: 13,
  },
});

export const ErrorBox: React.FC<ErrorBoxProps> = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};
