import React, { useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView as SAFESafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants';
import { Chat, Message, User } from '../types';
import { ChatBubble } from '../components';
import { commonStyles } from '../styles/common';
import { getDateKey, formatDateLabel } from '../utils/formatting';

interface ChatMessagesScreenProps {
  chat: Chat;
  messages: Message[];
  currentUser: User | null;
  messageInput: string;
  onMessageInputChange: (text: string) => void;
  onSendMessage: () => void;
  onDeleteMessage: (messageId: string) => void;
  replyingTo: Message | null;
  onReplyingToChange: (message: Message | null) => void;
  onBackPress: () => void;
  connectionStatus: string;
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────
  chatHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgSecondary,
    flexShrink: 0,
  },
  chatHeaderName: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginRight: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  backButtonIcon: {
    color: theme.textPrimary,
    fontSize: 28,
    lineHeight: 28,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },

  // ── Messages list ────────────────────────────────────────────────────────
  messagesList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesBackground: {
    flex: 1,
    backgroundColor: theme.bgPage,
  },
  messagesBackgroundImage: {
    opacity: 0.22,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  dateSeparator: {
    alignSelf: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#182229',
    marginVertical: 6,
  },
  dateSeparatorText: {
    color: '#D1D7DB',
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Reply preview ────────────────────────────────────────────────────────
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.accent,
    borderLeftWidth: 4,
    borderLeftColor: theme.accent,
    backgroundColor: theme.bgSecondary,
    flexShrink: 0,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreviewText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
  replyPreviewClose: {
    color: theme.textSecondary,
    fontSize: 22,
    paddingHorizontal: 8,
  },

  // ── Warning bar ──────────────────────────────────────────────────────────
  warningBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.warningBg,
    borderTopWidth: 1,
    borderTopColor: theme.warning,
    flexShrink: 0,
  },
  warningText: {
    color: theme.warning,
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Input bar ────────────────────────────────────────────────────────────
  // This is the sticky bottom bar that sits above the keyboard.
  // flex-shrink: 0 ensures it never gets squashed regardless of content.
  inputRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: theme.bgSecondary,
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: 0,
    paddingHorizontal: 14,
    // Symmetric vertical padding so the text sits centred in single-line mode
    // and the input grows upward for multiline.
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#E9EDEF',
    fontSize: 16,
    backgroundColor: theme.bgTertiary,
  },
  messageInputFocused: {
    borderWidth: 1,
    borderColor: '#3C4A52',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#0B141A',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 1,
  },
});

interface GroupedMessage {
  id: string;
  date: string;
  items: Message[];
}

export const ChatMessagesScreen: React.FC<ChatMessagesScreenProps> = ({
  chat,
  messages,
  currentUser,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onDeleteMessage,
  replyingTo,
  onReplyingToChange,
  onBackPress,
  connectionStatus,
}) => {
  const messagesListRef = useRef<FlatList<any> | null>(null);
  const inputRef = useRef<RNTextInput | null>(null);
  const [inputFocused, setInputFocused] = React.useState(false);

  // Scroll to bottom whenever the message list changes — covers:
  // • initial load, • sending a message, • receiving a new message
  useEffect(() => {
    if (messages.length === 0) return;
    // Small timeout lets the FlatList finish laying out the new item
    const t = setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  const groupedMessages = useMemo((): GroupedMessage[] => {
    const groups: GroupedMessage[] = [];
    let currentKey: string | null = null;
    let current: Message[] = [];

    for (const msg of messages) {
      const k = getDateKey(msg.createdAt);
      if (k !== currentKey) {
        if (currentKey) {
          groups.push({ id: currentKey, date: currentKey, items: current });
        }
        currentKey = k;
        current = [msg];
      } else {
        current.push(msg);
      }
    }
    if (currentKey) {
      groups.push({ id: currentKey, date: currentKey, items: current });
    }
    return groups;
  }, [messages]);

  const getOtherParticipantName = (): string => {
    if (!currentUser) return 'Unknown';
    if (chat.otherParticipant?.username) return chat.otherParticipant.username;
    return chat.participants.find(
      (id) => String(id) !== String(currentUser._id),
    ) as string;
  };

  const canSendMessage = chat.status === 'accepted';



  return (
    /**
     * KeyboardAvoidingView wraps the ENTIRE screen.
     *
     * iOS: behavior="padding" adds padding at the bottom equal to the
     *   keyboard height, which pushes the inner flex column upward —
     *   the FlatList shrinks and the input bar stays visible.
     *
     * Android: behavior="height" reduces the height of the view instead
     *   of adding padding. This works reliably together with
     *   android:windowSoftInputMode="adjustResize" (default for Expo).
     *
     * keyboardVerticalOffset on iOS must cover everything above the
     * KeyboardAvoidingView itself. Here it's 0 because KAV is the root.
     */
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bgPage }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Top safe-area only; bottom inset is handled by input row container. */}
      <SAFESafeAreaView
        edges={['top']}
        style={[commonStyles.safeArea, { paddingBottom: 0 }]}
      >
        {/* Inner flex column: header | list | reply-preview | input */}
        <View style={{ flex: 1, flexDirection: 'column' }}>

          {/* ── Chat header ── */}
          <View style={styles.chatHeader}>
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
                <Text style={styles.backButtonIcon}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={styles.chatHeaderName}>
                {getOtherParticipantName()}
              </Text>
            </View>
            <View
              style={[
                styles.connectionDot,
                {
                  backgroundColor:
                    connectionStatus === 'connected'
                      ? theme.success
                      : connectionStatus === 'connecting'
                      ? theme.warning
                      : theme.error,
                },
              ]}
            />
          </View>

          {/* ── Messages list (flex: 1 — fills all remaining space) ── */}
          <ImageBackground
            source={require('../../assets/chat-wallpaper.png')}
            style={styles.messagesBackground}
            imageStyle={styles.messagesBackgroundImage}
            resizeMode="cover"
          >
            <FlatList
              ref={messagesListRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              overScrollMode="never"
              bounces={false}
              alwaysBounceVertical={false}
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="never"
              data={groupedMessages}
              keyExtractor={(g) => g.id}
              renderItem={({ item: group }) => (
                <View>
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>
                      {formatDateLabel(group.date)}
                    </Text>
                  </View>
                  {group.items.map((message: Message) => {
                    const isOwn =
                      String(message.senderId) === String(currentUser?._id);
                    return (
                      <ChatBubble
                        key={message._id}
                        message={message}
                        isOwn={isOwn}
                        currentUserId={currentUser?._id ?? ''}
                        onReply={onReplyingToChange}
                        onDelete={onDeleteMessage}
                      />
                    );
                  })}
                </View>
              )}
            />
          </ImageBackground>

          {/* ── Reply preview (slides in above input, flex-shrink: 0) ── */}
          {replyingTo && (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewLabel}>
                  Replying to{' '}
                  {String(replyingTo.senderId) === String(currentUser?._id)
                    ? 'you'
                    : replyingTo.senderName ?? 'user'}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onReplyingToChange(null)}>
                <Text style={styles.replyPreviewClose}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Warning when chat not yet accepted ── */}
          {!canSendMessage && (
            <View style={styles.warningBar}>
              <Text style={styles.warningText}>
                Chat must be accepted before sending messages
              </Text>
            </View>
          )}

          {/* ── Input row (flex-shrink: 0 — never hidden) ── */}
          {/* SAFESafeAreaView with edges=['bottom'] adds the home-bar inset
               below the input only, mirroring env(safe-area-inset-bottom)
               in the web client. Falls back to 0 if no provider is set up. */}
          <SAFESafeAreaView edges={['bottom']} style={styles.inputRow}>
            <RNTextInput
              ref={inputRef}
              style={[
                styles.messageInput,
                inputFocused && styles.messageInputFocused,
              ]}
              placeholder="Type a message…"
              placeholderTextColor={theme.textSecondary}
              value={messageInput}
              onChangeText={onMessageInputChange}
              multiline
              editable={canSendMessage}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              blurOnSubmit={false}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageInput.trim() || !canSendMessage) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={onSendMessage}
              disabled={!messageInput.trim() || !canSendMessage}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </SAFESafeAreaView>

        </View>
      </SAFESafeAreaView>
    </KeyboardAvoidingView>
  );
};
