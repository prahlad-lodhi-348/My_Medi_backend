import { useAuth } from "@/context/AuthContext";
import { getInventory } from "@/src/api/phase2";
import { Regimen } from "@/src/types/phase2";
import * as ImagePicker from 'expo-image-picker';
import { Stack } from "expo-router";
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { analyzeMedicine } from "../services/api";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

/** Build a compact medicine context string from regimens */
function buildContext(regimens: Regimen[]): string {
  if (regimens.length === 0) return "";
  const lines = regimens.map((r) => {
    const stock = r.stock
      ? `, stock: ${r.stock.current_quantity} ${r.stock.unit}`
      : "";
    const doses = r.dose_times.map((d) => `${d.time.slice(0, 5)} (${d.quantity} ${d.unit})`).join(", ");
    return `- ${r.medicine.name} ${r.medicine.strength} [${r.medicine.form}]${stock}, doses: ${doses}`;
  });
  return `[Patient's current medicines:\n${lines.join("\n")}]`;
}

export default function AIChat() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "#ffffff" : "#1C1917";
  const bg = isDark ? "#000" : "#f5f5f5";
  const inputBg = isDark ? "#1f2937" : "#fff";

  // Medicine context state
  const [contextLoading, setContextLoading] = useState(true);
  const [medicineContext, setMedicineContext] = useState("");
  const [contextErr, setContextErr] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "ai", content: "Hello! I am Neuro AI. How can I assist with your health or medications today? Tap camera 📷 to upload medicine image for analysis." },
  ]);
  const [query, setQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLongThinking, setIsLongThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Image analysis functions
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library for Neuro AI image analysis.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera for Neuro AI.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage || !token) return Alert.alert('Error', 'Image or login issue.');

    setImageAnalyzing(true);
    setMessages(p => [...p, { id: `img-${Date.now()}`, role: 'user' as const, content: '📷 Neuro AI analyzing image...' }]);

    try {
      const result = await analyzeMedicine(token, selectedImage);
      const content = `✅ Analysis:\nMedicine: ${result.name || 'Detected'}\nForm: ${result.form || 'N/A'}\nAdded to inventory!`;
      const aiMsg = { id: `ai-${Date.now()}`, role: 'ai' as const, content };
      setMessages(p => [...p, aiMsg]);
      Speech.speak(result.name || 'Medicine analyzed', { language: 'en' });
    } catch {
      setMessages(p => [...p, { id: `err-${Date.now()}`, role: 'ai' as const, content: 'Image analysis failed. Try text chat.' }]);
    } finally {
      setSelectedImage(null);
      setImageAnalyzing(false);
    }
  };

  const speakLast = () => {
    const last = messages[messages.length - 1];
    if (last?.role === 'ai') Speech.speak(last.content, { language: 'en' });
  };


  useEffect(() => {
    setContextLoading(true);
    getInventory()
      .then((regimens) => {
        const ctx = buildContext(Array.isArray(regimens) ? regimens : []);
        setMedicineContext(ctx);
        if (ctx) {
          setMessages((prev) => [
            ...prev,
            {
              id: "ctx",
              role: "ai",
              content: `I can see you're tracking ${(regimens as Regimen[]).length} medicine(s). I'll factor these into my answers. Ask me anything!`,
            },
          ]);
        }
      })
      .catch(() => setContextErr(true))
      .finally(() => setContextLoading(false));
  }, []);

  const handleSend = async () => {
    if (!query.trim()) return;
    if (!token) {
      Alert.alert("Not signed in", "Please log in to use Neuro AI.");
      return;
    }
    if (contextLoading) {
      Alert.alert("Please wait", "Loading your medicine data...");
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    setIsLongThinking(false);

    const thinkingTimer = setTimeout(() => setIsLongThinking(true), 5000);

    // Prepend medicine context to the message
    const fullMessage = medicineContext
      ? `${medicineContext}\n\nUser: ${userMsg.content}`
      : userMsg.content;

    try {
      const BASE = (() => {
        const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
        if (envBase && envBase.startsWith("http")) return envBase;
        return "http://192.168.1.1:8000/api";
      })();

      const res = await fetch(`${BASE}/ai-chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ message: fullMessage }),
      });

      const json = await res.json().catch(() => ({}));
      const aiText = json?.response ?? json?.reply ?? json?.message ?? "No response received.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: aiText },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        },
      ]);
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
        maxWidth: "82%",
        borderRadius: 18,
        padding: 14,
        alignSelf: item.role === "user" ? "flex-end" : "flex-start",
        backgroundColor:
          item.role === "user"
            ? "#2563eb"
            : isDark
              ? "#1f2937"
              : "#fff",
        borderBottomRightRadius: item.role === "user" ? 4 : 18,
        borderBottomLeftRadius: item.role === "ai" ? 4 : 18,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ color: item.role === "user" ? "#fff" : textColor, fontSize: 15, lineHeight: 22 }}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: "Neuro AI",
          headerStyle: { backgroundColor: bg },
          headerTintColor: isDark ? "#fff" : "#0d9488",
        }}
      />


{/* Camera Button */}
{Platform.OS !== 'web' && (
  <TouchableOpacity
    onPress={() => {
      Alert.alert(
        'Add Image',
        'Choose source',
        [
          { text: 'Camera', onPress: takePhoto },
          { text: 'Gallery', onPress: pickImage },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }}
    style={{
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
    }}
  >
    <Text style={{ fontSize: 22 }}>📷</Text>
  </TouchableOpacity>
)}

      {/* Medicine context loading banner */}
      {contextLoading && (
        <View style={{
          backgroundColor: isDark ? "#0d948820" : "#f0fdfa",
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#0d948840" : "#ccfbf1",
        }}>
          <ActivityIndicator size="small" color="#0d9488" />
          <Text style={{ color: isDark ? "#0d9488" : "#0f766e", fontSize: 13, fontWeight: "600" }}>
            Loading your medicine data...
          </Text>
        </View>
      )}

      {/* Context error banner */}
      {contextErr && !contextLoading && (
        <View style={{
          backgroundColor: isDark ? "#1f111520" : "#fef2f2",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#ef444430" : "#fecaca",
        }}>
          <Text style={{ color: isDark ? "#fca5a5" : "#dc2626", fontSize: 12 }}>
            ⚠️ Could not load medicine list. AI responses may be less personalised.
          </Text>
        </View>
      )}

      {/* Medicine context loaded badge */}
      {!contextLoading && !contextErr && medicineContext && (
        <View style={{
          backgroundColor: isDark ? "#0d948815" : "#f0fdfa",
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#0d948830" : "#ccfbf1",
        }}>
          <Text style={{ fontSize: 12, color: isDark ? "#0d9488" : "#0f766e", fontWeight: "700" }}>
            💊 Medicine context loaded — AI is aware of your medications
          </Text>
        </View>
      )}

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
            {(imageAnalyzing || loading) && !isLongThinking && (
              <View style={{
                alignSelf: "flex-start",
                backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                borderBottomLeftRadius: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}>
                <ActivityIndicator color={isDark ? "#fff" : "#374151"} size="small" />
                <Text style={{ color: isDark ? "#94a3b8" : "#6b7280", fontSize: 13 }}>
                  {imageAnalyzing ? 'Analyzing image...' : 'Thinking...'}
                </Text>
              </View>
            )}
            {loading && isLongThinking && (
              <View style={{
                alignSelf: "flex-start",
                backgroundColor: isDark ? "#1f2937" : "#e5e7eb",
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                borderBottomLeftRadius: 4,
              }}>
                <Text style={{ color: isDark ? "#fff" : "#374151" }}>Neuro AI is thinking deeply...</Text>
              </View>
            )}
            <View style={{ paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" }}>
              <Text style={{ color: isDark ? "#64748b" : "#9ca3af", fontSize: 11, textAlign: "center" }}>
                ⚠️ Neuro AI provides general health info only. Always consult your doctor for medical advice.
              </Text>
            </View>
          </>
        )}
      />

      {/* Input bar */}
      <View style={{
        padding: 12,
        paddingBottom: Platform.OS === "ios" ? 8 : 12,
        backgroundColor: isDark ? "#111827" : "#f3f4f6",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: isDark ? "#1f2937" : "#e5e7eb",
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: inputBg,
            color: textColor,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 24,
            fontSize: 15,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: isDark ? "#374151" : "#e5e7eb",
            lineHeight: 20,
          }}
          placeholder={contextLoading ? "Loading medicines..." : "Ask anything about your medications..."}
          placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSend}
          multiline
          editable={!contextLoading}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !query.trim() || contextLoading}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              loading || !query.trim() || contextLoading
                ? isDark ? "#374151" : "#d1d5db"
                : "#2563eb",
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 20 }}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
