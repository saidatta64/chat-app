import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
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
  patchMessage: (messageId: string, patch: Partial<Message>) => void;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  onFetchOlderMessages: () => void;
  isOtherUserTyping?: boolean;
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
  fetchOlderButton: {
    alignSelf: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#182229',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  fetchOlderButtonDisabled: {
    opacity: 0.55,
  },
  fetchOlderButtonText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  typingBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  typingText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  typingDots: {
    color: theme.accent,
    fontWeight: '700',
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

type ListRow =
  | { kind: 'date'; id: string; dateKey: string }
  | { kind: 'message'; id: string; message: Message };

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
  patchMessage,
  hasMoreMessages,
  loadingOlderMessages,
  onFetchOlderMessages,
  isOtherUserTyping,
}) => {
  const messagesListRef = useRef<FlatList<ListRow> | null>(null);
  const messageRowRefs = useRef<Record<string, View | null>>({});
  const inputRef = useRef<RNTextInput | null>(null);
  const [inputFocused, setInputFocused] = React.useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  );
  const lastMessageIdRef = useRef<string | null>(null);
  const prependingRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);

  // Scroll to bottom only when a new message arrives at the end (not when loading older)
  useEffect(() => {
    if (messages.length === 0) {
      lastMessageIdRef.current = null;
      return;
    }
    const lastId = messages[messages.length - 1]._id;
    if (lastMessageIdRef.current === lastId) return;
    lastMessageIdRef.current = lastId;
    const t = setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [messages]);

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

  const listRows = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    for (const g of groupedMessages) {
      rows.push({ kind: 'date', id: `date-${g.id}`, dateKey: g.date });
      for (const m of g.items) {
        rows.push({ kind: 'message', id: m._id, message: m });
      }
    }
    return rows;
  }, [groupedMessages]);

  const scrollToMessageId = useCallback(
    (messageId: string) => {
      const targetId = String(messageId);
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2200);

      const listRef = messagesListRef.current;
      const rowRef = messageRowRefs.current[targetId];

      const scrollByIndex = () => {
        const idx = listRows.findIndex(
          (r) => r.kind === 'message' && String(r.id) === targetId,
        );
        if (idx >= 0 && listRef) {
          listRef.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.35,
          });
        }
      };

      if (!listRef) return;

      const scrollView = listRef.getNativeScrollRef?.();
      if (!rowRef || !scrollView) {
        scrollByIndex();
        return;
      }

      rowRef.measureLayout(
        scrollView as any,
        (_left, top) => {
          listRef.scrollToOffset({
            offset: Math.max(0, top - 72),
            animated: true,
          });
        },
        scrollByIndex,
      );
    },
    [listRows],
  );

  const getOtherParticipantName = (): string => {
    if (!currentUser) return 'Unknown';
    if (chat.otherParticipant?.username) return chat.otherParticipant.username;
    return chat.participants.find(
      (id) => String(id) !== String(currentUser._id),
    ) as string;
  };

  const canSendMessage = chat.status === 'accepted';

  const handleFetchOlder = () => {
    prependingRef.current = true;
    onFetchOlderMessages();
  };

  const listHeader = hasMoreMessages ? (
    <TouchableOpacity
      style={[
        styles.fetchOlderButton,
        loadingOlderMessages && styles.fetchOlderButtonDisabled,
      ]}
      onPress={handleFetchOlder}
      disabled={loadingOlderMessages}
      activeOpacity={0.75}
    >
      <Text style={styles.fetchOlderButtonText}>
        {loadingOlderMessages ? 'Loading…' : 'Fetch earlier messages'}
      </Text>
    </TouchableOpacity>
  ) : null;

  const typingLabel = isOtherUserTyping
    ? `${getOtherParticipantName()} is typing`
    : null;

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

          {typingLabel ? (
            <View style={styles.typingBar}>
              <Text style={styles.typingText}>
                {typingLabel}
                <Text style={styles.typingDots}>...</Text>
              </Text>
            </View>
          ) : null}

          {/* ── Messages list (flex: 1 — fills all remaining space) ── */}
          <ImageBackground
            source={require('../../assets/chat-wallpaper.jpg')}
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
              data={listRows}
              extraData={highlightedMessageId}
              keyExtractor={(row) => row.id}
              ListHeaderComponent={listHeader}
              onScroll={(e) => {
                scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
              }}
              onContentSizeChange={(_w, h) => {
                if (
                  prependingRef.current &&
                  contentHeightRef.current > 0 &&
                  h > contentHeightRef.current
                ) {
                  const delta = h - contentHeightRef.current;
                  messagesListRef.current?.scrollToOffset({
                    offset: scrollOffsetRef.current + delta,
                    animated: false,
                  });
                  prependingRef.current = false;
                }
                contentHeightRef.current = h;
              }}
              initialNumToRender={Math.min(listRows.length, 100)}
              maxToRenderPerBatch={Math.min(listRows.length, 50)}
              windowSize={15}
              onScrollToIndexFailed={(info) => {
                messagesListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: false,
                });
                setTimeout(() => {
                  messagesListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.35,
                  });
                }, 150);
              }}
              renderItem={({ item: row }) => {
                if (row.kind === 'date') {
                  return (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>
                        {formatDateLabel(row.dateKey)}
                      </Text>
                    </View>
                  );
                }
                const message = row.message;
                const isOwn =
                  String(message.senderId) === String(currentUser?._id);
                return (
                  <View
                    ref={(node) => {
                      messageRowRefs.current[String(message._id)] = node;
                    }}
                    collapsable={false}
                  >
                    <ChatBubble
                      message={message}
                      isOwn={isOwn}
                      currentUserId={currentUser?._id ?? ''}
                      onReply={onReplyingToChange}
                      onDelete={onDeleteMessage}
                      onReplyNavigate={scrollToMessageId}
                      onPatchMessage={patchMessage}
                      isHighlighted={highlightedMessageId === String(message._id)}
                    />
                  </View>
                );
              }}
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
