import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { theme } from '../constants';
import { Button, TextInput, ErrorBox } from '../components';
import { commonStyles } from '../styles/common';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string;
}

const styles = StyleSheet.create({
  // KeyboardAvoidingView fills the whole safe area
  kav: {
    flex: 1,
  },
  // ScrollView lets the form scroll up when the keyboard opens.
  // contentContainerStyle centres the card vertically when there's
  // enough room, but lets it scroll when the keyboard is up.
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
  },
});

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  loading,
  error,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handlePress = async () => {
    if (!username.trim() || !password) return;
    await onLogin(username, password);
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {/*
        KeyboardAvoidingView behaviour:
        • iOS   → "padding": adds bottom padding equal to keyboard height,
                  pushing the ScrollView content upward.
        • Android → "height": shrinks the view height so content fits above
                  the keyboard. Works together with adjustResize (Expo default).
      */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.appTitle}>💬 Edu App</Text>
          <Text style={styles.subtitle}>
            Enter your username and password to sign in or create an account.
          </Text>

          <TextInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <TextInput
            label="Password"
            placeholder="Enter your password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handlePress}
          />

          {error && <ErrorBox message={error} />}

          <Button
            onPress={handlePress}
            loading={loading}
            disabled={!username.trim() || !password || loading}
          >
            Enter
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
