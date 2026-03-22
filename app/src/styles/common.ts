import { StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { theme } from '../constants';

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bgPage,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
  },
  flex1: {
    flex: 1,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: theme.accent,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgTertiary,
  },
  secondaryButtonText: {
    color: theme.textPrimary,
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
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
  errorBox: {
    backgroundColor: theme.errorBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: theme.error,
    fontSize: 13,
  },
  successText: {
    color: theme.success,
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
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
