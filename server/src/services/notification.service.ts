import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from '../models/User';

const expo = new Expo();

class NotificationService {
  /**
   * Send a push notification about a new message to given recipient user IDs.
   */
  async sendMessageNotification(
    recipientUserIds: string[],
    data: { senderName: string; content: string; chatId: string; senderId: string }
  ): Promise<void> {
    if (!recipientUserIds.length) return;

    const users = await User.find({
      _id: { $in: recipientUserIds },
      expoPushToken: { $ne: null },
    }).select('expoPushToken username');

    const messages: ExpoPushMessage[] = [];

    for (const user of users) {
      const token = (user as any).expoPushToken as string | undefined;
      if (!token || !Expo.isExpoPushToken(token)) continue;

      messages.push({
        to: token,
        sound: 'default',
        title: data.senderName || 'New message',
        body: data.content.length > 80 ? `${data.content.slice(0, 77)}...` : data.content,
        data: {
          chatId: data.chatId,
          senderId: data.senderId,
        },
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error('Failed to send push notification chunk', err);
      }
    }
  }
}

export default new NotificationService();

