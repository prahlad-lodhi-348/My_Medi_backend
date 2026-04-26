import { apiPost } from "@/src/api/client";
import { useAuth } from "@/context/AuthContext";
import { Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

async function sendAIMessage(token: string, content: string): Promise<{ response?: string }> {
  return apiPost('ai/chat/', { message: content });
}

export default function AIChat() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Hello! I am Neuro AI. How can I assist with your health or medications today?' }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLongThinking, setIsLongThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1917';
  const bg = isDark ? '#000' : '#f5f5f5';
  const inputBg = isDark ? '#1f2937' : '#fff';

  const handleSend = async () => {
    if (!query.trim() || !token) {
      Alert.alert('Not signed in', 'Please log in to use Neuro AI.');
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);
    setIsLongThinking(false);

    const thinkingTimer = setTimeout(() => {
      setIsLongThinking(true);
    }, 5000);

    try {
      const data = await sendAIMessage(token, userMsg.content);
      const aiText = data?.response || 'No response';
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: aiText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: "Sorry, I'm having trouble connecting right now. Please try again later." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      clearTimeout(thinkingTimer);
      setLoading(false);
      setIsLongThinking(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={{
        marginBottom: 12,
        maxWidth: '80%',
        borderRadius: 16,
        padding: 14,
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
        backgroundColor: item.role === 'user' ? '#2563eb' : (isDark ? '#1f2937' : '#fff'),
        borderBottomRightRadius: item.role === 'user' ? 4 : 16,
        borderBottomLeftRadius: item.role === 'ai' ? 4 : 16,
      }}
    >
      <Text style={{ color: item.role === 'user' ? '#fff' : textColor, fontSize: 15, lineHeight: 20 }}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: 'Neuro AI', headerStyle: { backgroundColor: bg }, headerTintColor: isDark ? '#fff' : '#0d9488' }} />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={() => (
          <>
            {loading && !isLongThinking && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#1f2937' : '#e5e7eb', borderRadius: 16, padding: 14, marginBottom: 12, borderBottomLeftRadius: 4 }}>
                <ActivityIndicator color={isDark ? '#fff' : '#374151'} size="small" />
              </View>
            )}
            {loading && isLongThinking && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#1f2937' : '#e5e7eb', borderRadius: 16, padding: 14, marginBottom: 12, borderBottomLeftRadius: 4 }}>
                <Text style={{ color: isDark ? '#fff' : '#374151' }}>Neuro AI is thinking...</Text>
              </View>
            )}
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#64748b' : '#9ca3af', fontSize: 11, textAlign: 'center' }}>
                ⚠️ Neuro AI provides general health info only. Always consult your doctor for medical advice.
              </Text>
            </View>
          </>
        )}
      />

      <View style={{ padding: 12, backgroundColor: isDark ? '#111827' : '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: inputBg,
            color: textColor,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 24,
            fontSize: 15,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#e5e7eb',
          }}
          placeholder="Type your question..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSend}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !query.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 10,
            backgroundColor: !query.trim() ? (isDark ? '#374151' : '#d1d5db') : '#2563eb',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
