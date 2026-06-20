import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { theme, API_URL } from '../constants';
import { Message } from '../types';
import { linkify, formatTime, extractFirstHttpUrl } from '../utils/formatting';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReplyNavigate?: (replyToId: string) => void;
  onPatchMessage?: (messageId: string, patch: Partial<Message>) => void;
  isHighlighted?: boolean;
}

const styles = StyleSheet.create({
  messageRow: {
    marginVertical: 2,
    maxWidth: '80%',
    flexShrink: 1,
  },
  messageRowHighlight: {
    borderRadius: 10,
    padding: 2,
    backgroundColor: 'rgba(0,168, 132, 0.12)',
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    flexShrink: 1,
    overflow: 'hidden',
  },
  messageBubbleOwn: {
    backgroundColor: theme.bubbleSent,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: theme.bubbleReceived,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    color: theme.textPrimary,
    fontSize: 14,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  messageActions: {
    flexDirection: 'row',
    marginLeft: 4,
    opacity: 0.55,
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
    fontSize: 10,
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
    marginBottom: 6,
    flexShrink: 1,
    paddingVertical: 4,
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
    opacity: 0.85,
  },
  linkPreviewOuter: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
    maxWidth: 260,
  },
  linkPreviewImageWrap: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkPreviewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  playBadge: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBadgeText: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 3,
  },
  linkPreviewBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  linkPreviewTitle: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  linkPreviewSite: {
    color: theme.textSecondary,
    fontSize: 11,
  },
});

function hostnameOnly(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  currentUserId,
  onReply,
  onDelete,
  onReplyNavigate,
  onPatchMessage,
  isHighlighted,
}) => {
  const previewAttemptKey = useRef<string | null>(null);

  useEffect(() => {
    if (message.linkPreview || !onPatchMessage) return;
    const url = extractFirstHttpUrl(message.content);
    if (!url) return;
    const key = `${message._id}:${url}`;
    if (previewAttemptKey.current === key) return;
    previewAttemptKey.current = key;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/chat/link-preview?url=${encodeURIComponent(url)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { preview?: Message['linkPreview'] };
        if (data.preview && !cancelled) {
          onPatchMessage(message._id, { linkPreview: data.preview });
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [message._id, message.content, message.linkPreview, onPatchMessage]);

  const lp = message.linkPreview;
  const openPreviewUrl = () => {
    const href = lp?.url ?? extractFirstHttpUrl(message.content);
    if (href) {
      Linking.openURL(href).catch((err) =>
        console.warn('Failed to open URL:', href, err),
      );
    }
  };

  return (
    <View
      style={[
        styles.messageRow,
        isOwn ? styles.messageRowOwn : styles.messageRowOther,
        isHighlighted ? styles.messageRowHighlight : null,
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
            <TouchableOpacity
              style={styles.replyContext}
              onPress={() =>
                message.replyTo?._id &&
                onReplyNavigate?.(String(message.replyTo._id))
              }
              activeOpacity={0.7}
              disabled={!onReplyNavigate || !message.replyTo._id}
            >
              <Text style={styles.replyContextName}>
                {String(message.replyTo.senderId) === String(currentUserId)
                  ? 'You'
                  : message.replyTo.senderName ?? 'User'}
              </Text>
              <Text style={styles.replyContextText} numberOfLines={2}>
                {message.replyTo.content}
              </Text>
            </TouchableOpacity>
          )}
          {lp && (lp.imageUrl || lp.title || lp.siteName) && (
            <TouchableOpacity
              style={styles.linkPreviewOuter}
              onPress={openPreviewUrl}
              activeOpacity={0.85}
            >
              {lp.imageUrl ? (
                <View style={styles.linkPreviewImageWrap}>
                  <Image
                    source={{ uri: lp.imageUrl }}
                    style={styles.linkPreviewImage}
                  />
                  {lp.isVideo ? (
                    <View style={styles.playBadge} pointerEvents="none">
                      <Text style={styles.playBadgeText}>{'\u25B6'}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.linkPreviewBody}>
                {lp.title ? (
                  <Text style={styles.linkPreviewTitle} numberOfLines={3}>
                    {lp.title}
                  </Text>
                ) : null}
                <Text style={styles.linkPreviewSite} numberOfLines={1}>
                  {lp.siteName ?? hostnameOnly(lp.url)}
                </Text>
              </View>
            </TouchableOpacity>
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
            <Text style={styles.iconButtonText}>{'\u21A9'}</Text>
          </TouchableOpacity>
          {isOwn && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onDelete(message._id)}
            >
              <Text style={styles.iconButtonText}>{'\uD83D\uDDD1'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
      {isOwn && message.readAt && (
        <Text style={styles.messageSeen}>Seen</Text>
      )}
    </View>
  );
};
