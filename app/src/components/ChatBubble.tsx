import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../constants';
import { Message } from '../types';
import { linkify, formatTime } from '../utils/formatting';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

const styles = StyleSheet.create({
  messageRow: {
    marginVertical: 4,
    maxWidth: '80%',
    flexShrink: 1,
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '100%',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    flexShrink: 1,
  },
  messageBubbleOwn: {
    backgroundColor: theme.bubbleSent,
    borderWidth: 1,
    borderColor: theme.bubbleSentBorder,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: theme.bubbleReceived,
    borderWidth: 1,
    borderColor: theme.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: theme.textPrimary,
    fontSize: 14,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  messageActions: {
    flexDirection: 'row',
    marginLeft: 6,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  iconButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  messageTime: {
    marginTop: 2,
    fontSize: 11,
    color: theme.textSecondary,
    paddingHorizontal: 4,
  },
  messageSeen: {
    fontSize: 10,
    color: theme.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    marginTop: 1,
    opacity: 0.9,
  },
  replyContext: {
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    paddingLeft: 8,
    marginBottom: 4,
    flexShrink: 1,
  },
  replyContextName: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  replyContextText: {
    color: theme.textPrimary,
    fontSize: 12,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  currentUserId,
  onReply,
  onDelete,
}) => {
  return (
    <View
      style={[
        styles.messageRow,
        isOwn ? styles.messageRowOwn : styles.messageRowOther,
      ]}
    >
      <View style={styles.messageBubbleWrapper}>
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {message.replyTo && (
            <View style={styles.replyContext}>
              <Text style={styles.replyContextName}>
                {String(message.replyTo.senderId) === String(currentUserId)
                  ? 'You'
                  : message.replyTo.senderName ?? 'User'}
              </Text>
              <Text
                style={styles.replyContextText}
                numberOfLines={1}
              >
                {message.replyTo.content}
              </Text>
            </View>
          )}
          <Text style={styles.messageText}>
            {linkify(message.content, message._id)}
          </Text>
        </View>
        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onReply(message)}
          >
            <Text style={styles.iconButtonText}>↩</Text>
          </TouchableOpacity>
          {isOwn && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onDelete(message._id)}
            >
              <Text style={styles.iconButtonText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.messageTime}>
        {formatTime(message.createdAt)}
      </Text>
      {isOwn && message.readAt && (
        <Text style={styles.messageSeen}>Seen</Text>
      )}
    </View>
  );
};
