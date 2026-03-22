import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../constants';
import { ConnectionStatus } from '../types';

interface StatusDotProps {
  status: ConnectionStatus;
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connected: {
    backgroundColor: theme.success,
  },
  disconnected: {
    backgroundColor: theme.error,
  },
  connecting: {
    backgroundColor: theme.warning,
  },
});

export const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const statusStyle =
    status === 'connected'
      ? styles.connected
      : status === 'disconnected'
      ? styles.disconnected
      : styles.connecting;

  return <View style={[styles.dot, statusStyle]} />;
};
