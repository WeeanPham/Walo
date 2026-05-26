import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/auth.store';
import { FirestoreService, ChatMessage } from '@/src/services/firestore.service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ChatScreen() {
  const { userRole } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Message Type Customizer Modal
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [msgType, setMsgType] = useState<'text' | 'note' | 'menuSuggestion'>('text');

  // Menu Suggestion Fields
  const [suggestName, setSuggestName] = useState('');
  const [suggestCalories, setSuggestCalories] = useState('');
  const [suggestMacros, setSuggestMacros] = useState(''); // e.g. "20g Đạm, 40g Carb, 8g Béo"

  // Subscribe to real-time chat messages
  useEffect(() => {
    setLoading(true);
    const unsub = FirestoreService.subscribeChat((data) => {
      setMessages(data);
      setLoading(false);
      // Scroll to bottom after state update
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    });
    return () => unsub();
  }, []);

  const handleSendMessage = async () => {
    if (msgType === 'text') {
      if (!inputText.trim()) return;
      
      const newMsg: Omit<ChatMessage, 'sentAt'> = {
        senderName: userRole || 'Anonymous',
        message: inputText,
        type: 'text',
      };
      
      setInputText('');
      await FirestoreService.sendMessage(newMsg);
    } else if (msgType === 'note') {
      if (!inputText.trim()) return;

      const newMsg: Omit<ChatMessage, 'sentAt'> = {
        senderName: userRole || 'Anonymous',
        message: inputText,
        type: 'note',
      };

      setInputText('');
      setMsgType('text');
      await FirestoreService.sendMessage(newMsg);
    } else if (msgType === 'menuSuggestion') {
      if (!suggestName || !suggestCalories) return;

      const formattedMsg = `📍 GỢI Ý THỰC ĐƠN:\n🍽️ Món ăn: ${suggestName}\n🔥 Lượng Calo: ${suggestCalories} kcal\n🌱 Dinh dưỡng: ${suggestMacros || 'Chưa cập nhật'}`;
      
      const newMsg: Omit<ChatMessage, 'sentAt'> = {
        senderName: userRole || 'Anonymous',
        message: formattedMsg,
        type: 'menuSuggestion',
      };

      setSuggestName('');
      setSuggestCalories('');
      setSuggestMacros('');
      setMenuModalVisible(false);
      setMsgType('text');
      await FirestoreService.sendMessage(newMsg);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderName === userRole;
    const isNote = item.type === 'note';
    const isMenu = item.type === 'menuSuggestion';

    let bubbleStyle: any = styles.otherBubble;
    let textStyle: any = styles.otherText;
    
    if (isMe) {
      bubbleStyle = styles.myBubble;
      textStyle = styles.myText;
    }

    if (isNote) {
      bubbleStyle = styles.noteBubble;
      textStyle = styles.noteText;
    } else if (isMenu) {
      bubbleStyle = styles.menuBubble;
      textStyle = styles.menuText;
    }

    const formattedTime = item.sentAt 
      ? format(item.sentAt.toDate(), 'HH:mm', { locale: vi }) 
      : '';

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: item.senderName === 'Weean' ? COLORS.primary : COLORS.secondary }]}>
            <Text style={styles.avatarText}>{item.senderName[0]}</Text>
          </View>
        )}
        
        <View style={{ maxWidth: '75%' }}>
          {/* Sender label (only for others) */}
          {!isMe && <Text style={styles.senderLabel}>{item.senderName}</Text>}
          
          <View style={[styles.bubble, bubbleStyle]}>
            {isNote && (
              <View style={styles.noteBadge}>
                <Ionicons name="document-text-outline" size={14} color="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={styles.noteBadgeText}>Ghi chú sức khỏe</Text>
              </View>
            )}

            {isMenu && (
              <View style={styles.menuBadge}>
                <Ionicons name="restaurant-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.menuBadgeText}>Gợi ý thực đơn</Text>
              </View>
            )}

            <Text style={[styles.messageText, textStyle]}>{item.message}</Text>
            
            <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
              {formattedTime}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar style="light" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang kết nối real-time chat...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id!}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyText}>Chưa có tin nhắn nào.</Text>
              <Text style={styles.emptySub}>Bắt đầu gửi ghi chú, thực đơn hoặc trò chuyện với đối tác của bạn.</Text>
            </View>
          }
        />
      )}

      {/* Input bar and action trays */}
      <View style={styles.inputContainer}>
        {/* Actions Tray */}
        <View style={styles.actionTray}>
          <TouchableOpacity 
            style={[styles.actionBadge, msgType === 'text' && styles.actionBadgeActive]}
            onPress={() => setMsgType('text')}
          >
            <Ionicons name="chatbox-ellipses-outline" size={14} color={msgType === 'text' ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.actionBadgeLabel, msgType === 'text' && styles.actionBadgeLabelActive]}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBadge, msgType === 'note' && styles.actionBadgeActiveNote]}
            onPress={() => setMsgType('note')}
          >
            <Ionicons name="document-text-outline" size={14} color={msgType === 'note' ? '#FBBF24' : COLORS.textMuted} />
            <Text style={[styles.actionBadgeLabel, msgType === 'note' && styles.actionBadgeLabelActiveNote]}>Ghi chú</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBadge}
            onPress={() => {
              setMsgType('menuSuggestion');
              setMenuModalVisible(true);
            }}
          >
            <Ionicons name="restaurant-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.actionBadgeLabel}>Gợi ý thực đơn</Text>
          </TouchableOpacity>
        </View>

        {/* Input box */}
        <View style={styles.inputBoxRow}>
          <TextInput
            style={[
              styles.textInput,
              msgType === 'note' && { borderColor: 'rgba(251, 191, 36, 0.4)', backgroundColor: 'rgba(251, 191, 36, 0.03)' },
              { maxHeight: 100 }
            ]}
            placeholder={msgType === 'note' ? 'Nhập ghi chú quan trọng...' : 'Nhập tin nhắn...'}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              msgType === 'note' ? { backgroundColor: '#FBBF24' } : { backgroundColor: COLORS.primary }
            ]}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Suggestion Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={menuModalVisible}
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đề xuất Thực đơn Sức khỏe</Text>
              <TouchableOpacity onPress={() => setMenuModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <Text style={styles.inputLabel}>Tên món ăn / Thực đơn đề xuất *</Text>
              <TextInput 
                style={styles.modalTextInput} 
                placeholder="Ví dụ: Salad ức gà nướng & bơ, Cháo yến mạch..." 
                placeholderTextColor={COLORS.textMuted}
                value={suggestName}
                onChangeText={setSuggestName}
              />

              <Text style={styles.inputLabel}>Ước lượng Calories (kcal) *</Text>
              <TextInput 
                style={styles.modalTextInput} 
                keyboardType="numeric"
                placeholder="320" 
                placeholderTextColor={COLORS.textMuted}
                value={suggestCalories}
                onChangeText={setSuggestCalories}
              />

              <Text style={styles.inputLabel}>Thành phần dinh dưỡng (Macros - Không bắt buộc)</Text>
              <TextInput 
                style={styles.modalTextInput} 
                placeholder="Ví dụ: 30g Đạm, 25g Carb, 10g Béo" 
                placeholderTextColor={COLORS.textMuted}
                value={suggestMacros}
                onChangeText={setSuggestMacros}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSendMessage}>
                <Text style={styles.submitBtnText}>Gửi đề xuất thực đơn</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  senderLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  noteBubble: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1.5,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  menuBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1.5,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.15)',
    paddingBottom: 4,
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  menuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.15)',
    paddingBottom: 4,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: COLORS.white,
  },
  otherText: {
    color: COLORS.text,
  },
  noteText: {
    color: COLORS.text,
    fontStyle: 'italic',
  },
  menuText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  otherTimestamp: {
    color: COLORS.textMuted,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionTray: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  actionBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  actionBadgeActiveNote: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  actionBadgeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionBadgeLabelActive: {
    color: COLORS.primary,
  },
  actionBadgeLabelActiveNote: {
    color: '#FBBF24',
  },
  inputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  modalTextInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.secondary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
