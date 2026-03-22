import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { theme } from '../constants';
import { Chat, User } from '../types';
import { Button, Sheet, TextInput } from '../components';
import { commonStyles } from '../styles/common';

interface ChatListScreenProps {
  chats: Chat[];
  currentUser: User | null;
  onSelectChat: (chat: Chat) => void;
  onCreateChat: (userId: string) => Promise<void>;
  onAcceptChat: (chat: Chat) => Promise<void>;
  onLogout: () => void;
  loading: boolean;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgSecondary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    maxWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.accentSoft,
  },
  userBadgeText: {
    color: theme.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  listHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  newChatButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.bgTertiary,
  },
  newChatButtonText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: theme.textSecondary,
    textAlign: 'center',
  },
  chatList: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  chatItem: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: theme.bgTertiary,
    marginBottom: 8,
  },
  chatItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatItemName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  chatStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chatStatusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: theme.warning,
  },
  chatStatusAccepted: {
    backgroundColor: theme.successBg,
    color: theme.success,
  },
  chatStatusRejected: {
    backgroundColor: theme.errorBg,
    color: theme.error,
  },
  acceptButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
});

export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  chats,
  currentUser,
  onSelectChat,
  onCreateChat,
  onAcceptChat,
  onLogout,
  loading,
}) => {
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);

  const handleCreateChat = async () => {
    if (!newChatUserId.trim()) return;
    setCreatingChat(true);
    try {
      await onCreateChat(newChatUserId.trim());
      setShowNewChat(false);
      setNewChatUserId('');
    } finally {
      setCreatingChat(false);
    }
  };

  const getOtherParticipantName = (chat: Chat): string => {
    if (!currentUser) return 'Unknown';
    if (chat.otherParticipant?.username) {
      return chat.otherParticipant.username;
    }
    return chat.participants.find(
      (id) => String(id) !== String(currentUser._id)
    ) as string;
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={commonStyles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>💬 Chat</Text>
          </View>
          <View style={styles.headerRight}>
            {currentUser && (
              <View style={styles.userBadge}>
                <Text style={styles.userBadgeText} numberOfLines={1}>
                  {currentUser.username}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={onLogout} style={{ opacity: 0.8, marginLeft: 6 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>Chats</Text>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => setShowNewChat(true)}
            >
              <Text style={styles.newChatButtonText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {chats.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No chats yet. Start a new chat!
              </Text>
            </View>
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.chatList}
              renderItem={({ item }) => {
                const isPending = item.status === 'pending';
                const isInitiator =
                  String(item.initiatedBy) === String(currentUser?._id);

                return (
                  <TouchableOpacity
                    style={styles.chatItem}
                    onPress={() => onSelectChat(item)}
                  >
                    <View style={styles.chatItemHeader}>
                      <Text style={styles.chatItemName} numberOfLines={1}>
                        {getOtherParticipantName(item)}
                      </Text>
                      <Text
                        style={[
                          styles.chatStatusBadge,
                          item.status === 'accepted'
                            ? styles.chatStatusAccepted
                            : item.status === 'pending'
                            ? styles.chatStatusPending
                            : styles.chatStatusRejected,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    {isPending && !isInitiator && (
                      <Button
                        size="small"
                        variant="primary"
                        style={styles.acceptButton}
                        onPress={() => onAcceptChat(item)}
                      >
                        Accept
                      </Button>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* New chat sheet */}
          {showNewChat && (
            <Sheet
              title="Start New Chat"
              subtitle="Paste the other user's ID to start a new chat."
            >
              <TextInput
                placeholder="User ID"
                value={newChatUserId}
                onChangeText={setNewChatUserId}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.sheetButtonsRow}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setShowNewChat(false);
                    setNewChatUserId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleCreateChat}
                  loading={creatingChat}
                  disabled={!newChatUserId.trim() || creatingChat}
                >
                  Create
                </Button>
              </View>
            </Sheet>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};
