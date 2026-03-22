import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface UsePushNotificationsReturn {
  expoPushToken: string | null;
  isLoading: boolean;
  permissionStatus: string | null;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        // Check if running on physical device
        if (!Device.isDevice) {
          console.log('⚠️ Push notifications only work on a physical device.');
          setPermissionStatus('simulator');
          setIsLoading(false);
          return;
        }

        // Request permissions
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        setPermissionStatus(finalStatus);

        if (finalStatus !== 'granted') {
          console.warn('❌ Push notification permission not granted');
          setIsLoading(false);
          return;
        }

        // Configure Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          console.log('✅ Android notification channel configured');
        }

        // Get project ID
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
        
        if (!projectId) {
          console.warn('⚠️ Project ID not found in app config, trying without it...');
        }

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenData.data;

        if (token) {
          console.log('✅ Expo push token obtained:', token.substring(0, 20) + '...');
          setExpoPushToken(token);
        } else {
          console.error('❌ Failed to get Expo push token');
        }
      } catch (error) {
        console.error('❌ Error setting up push notifications:', error);
        setPermissionStatus('error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { expoPushToken, isLoading, permissionStatus };
}

/**
 * Configure how notifications are handled when app is foregrounded
 * @returns cleanup function for removing listeners
 */
export function setupNotificationHandler(): () => void {
  // Set handler for foreground notifications
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  console.log('✅ Notification handler configured for foreground');

  return () => {
    // Cleanup function
    console.log('Notification handler cleaned up');
  };
}

/**
 * Setup listeners for notification events
 * @param onNotificationReceived - Called when notification is received while app is open
 * @param onNotificationResponse - Called when user taps a notification
 * @returns cleanup function for removing listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void,
): () => void {
  const listeners: Array<() => void> = [];

  // Listen for notifications when app is in foreground
  if (onNotificationReceived) {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📥 Notification received:', notification.request.content.title);
        onNotificationReceived(notification);
      }
    );
    listeners.push(subscription.remove);
  }

  // Listen for user tapping notification
  if (onNotificationResponse) {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response.notification.request.content.title);
        onNotificationResponse(response);
      }
    );
    listeners.push(subscription.remove);
  }

  return () => {
    listeners.forEach((remove) => remove());
    console.log('Notification listeners cleaned up');
  };
}
