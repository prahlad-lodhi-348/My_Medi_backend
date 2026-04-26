import { AppCard, AppScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/src/theme";
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { fetchMedicines, getReminderSpeech, Medicine } from '../../services/api';
import { playReminderVoice, speakText, stopSpeech } from '../../utils/voice';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? theme.dark.text : theme.light.text;
  const textSecondary = isDark ? theme.dark.textSecondary : theme.light.textSecondary;
  const textMuted = isDark ? theme.dark.textMuted : theme.light.textMuted;

  const userName = user?.username || 'Guest';
  const isEmailVerified = user?.is_email_verified ?? false;
  const stepCount = user?.step_count;
  const waterIntake = user?.water_intake;

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchMedicines(token);
        setMedicines(data);
      } catch (error) {
        console.error('Failed to fetch medicines', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  const nextDose = medicines.length > 0 ? medicines[0] : null;

  const handleListen = async () => {
    if (!nextDose || !token) return;
    setIsSpeaking(true);
    try {
      if (nextDose.id) {
        const speechData = await getReminderSpeech(token, nextDose.id);
        if (speechData?.speech) {
          speakText(speechData.speech, { onDone: () => setIsSpeaking(false), onStopped: () => setIsSpeaking(false) });
          return;
        }
      }
    } catch (_) { }
    playReminderVoice(userName, nextDose.name, nextDose.how_it_works);
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  const handleStopSpeech = () => { stopSpeech(); setIsSpeaking(false); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <AppScreen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Email Verification Banner */}
        {!isEmailVerified && (
          <View style={{ backgroundColor: '#fefce8', borderColor: '#fde68a', borderWidth: 1, borderRadius: theme.radius.xl, padding: 12, marginBottom: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '500', flex: 1 }}>Verify your email to unlock all features.</Text>
            <View style={{ backgroundColor: '#fde68a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 }}>
              <Text style={{ color: '#78350f', fontSize: 11, fontWeight: '700' }}>Verify</Text>
            </View>
          </View>
        )}

        {/* Greeting */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: theme.spacing.xl }}>
          <View>
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Neuro AI</Text>
            <Text style={{ color: textColor, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>{getGreeting()},{'\n'}{userName} 👋</Text>
          </View>
          <Link href="/add-medicine" asChild>
            <TouchableOpacity style={{ backgroundColor: theme.colors.info, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 }}>+</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Next Dose Card */}
        <AppCard style={{ marginBottom: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Next Dose</Text>
            <View style={{ backgroundColor: theme.colors.infoLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 50 }}>
              <Text style={{ color: theme.colors.info, fontSize: 11, fontWeight: '700' }}>Today</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.info} style={{ marginVertical: 24 }} />
          ) : nextDose ? (
            <>
              <Text style={{ color: textColor, fontSize: 30, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 }}>{nextDose.name}</Text>
              <Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500', marginTop: 2 }}>{nextDose.dosage || 'Standard dose'}</Text>
              {nextDose.how_it_works && (
                <View style={{ backgroundColor: isDark ? theme.dark.surfaceElevated : '#f8fafc', borderRadius: theme.radius.lg, padding: 14, marginTop: 14 }}>
                  <Text style={{ color: textColor, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>🔬 How it Works</Text>
                  <Text style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}>{nextDose.how_it_works}</Text>
                </View>
              )}
              {nextDose.side_effects && (
                <View style={{ backgroundColor: isDark ? '#1f1115' : theme.colors.dangerLight, borderRadius: theme.radius.lg, padding: 14, marginTop: 10, borderWidth: 1, borderColor: isDark ? '#3f1a20' : theme.colors.danger }}>
                  <Text style={{ color: isDark ? '#fca5a5' : theme.colors.danger, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>⚠️ Side Effects</Text>
                  <Text style={{ color: isDark ? '#fca5a5' : theme.colors.danger, fontSize: 13, lineHeight: 20 }}>{nextDose.side_effects}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.info, marginRight: 6 }} />
                  <Text style={{ color: theme.colors.info, fontWeight: '700', fontSize: 15 }}>{nextDose.time || 'Upcoming'}</Text>
                </View>
                <TouchableOpacity onPress={isSpeaking ? handleStopSpeech : handleListen} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isSpeaking ? (isDark ? '#1f1115' : '#fef2f2') : (isDark ? '#101520' : '#eff6ff'), paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 }}>
                  <Text style={{ fontSize: 16, marginRight: 5 }}>{isSpeaking ? '⏹' : '🔊'}</Text>
                  <Text style={{ color: isSpeaking ? theme.colors.danger : theme.colors.info, fontWeight: '700', fontSize: 13 }}>{isSpeaking ? 'Stop' : 'Listen'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: '700' }}>No scheduled doses</Text>
              <Text style={{ color: textSecondary, fontSize: 14, marginTop: 4 }}>You are all caught up for today! 🎉</Text>
            </View>
          )}
        </AppCard>

        {/* Health Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
          <AppCard style={{ width: '48%', padding: theme.spacing.md }}>
            <View style={{ backgroundColor: theme.colors.successLight, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 18 }}>👟</Text>
            </View>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Step Count</Text>
            <Text style={{ color: textColor, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{stepCount !== undefined ? stepCount.toLocaleString() : '—'}</Text>
            <Text style={{ color: theme.colors.success, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{stepCount !== undefined ? 'From your profile' : 'Not tracked yet'}</Text>
          </AppCard>
          <AppCard style={{ width: '48%', padding: theme.spacing.md }}>
            <View style={{ backgroundColor: '#cffafe', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 18 }}>💧</Text>
            </View>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Water Intake</Text>
            <Text style={{ color: textColor, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{waterIntake !== undefined ? waterIntake + 'L' : '—'}</Text>
            <Text style={{ color: '#0891b2', fontSize: 11, fontWeight: '600', marginTop: 4 }}>{waterIntake !== undefined ? 'of 2.5L daily goal' : 'Not tracked yet'}</Text>
          </AppCard>
        </View>

        {/* Medicine Inventory Link */}
        <Link href="/medicine-list" asChild>
          <TouchableOpacity style={{ marginBottom: theme.spacing.lg }}>
            <AppCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#e0e7ff', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18 }}>💊</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 18, fontWeight: '800' }}>Medicine Inventory</Text>
                  <Text style={{ color: textSecondary, fontSize: 13, marginTop: 3 }}>{medicines.length > 0 ? medicines.length + ' medicines tracked' : 'No medicines added yet'}</Text>
                </View>
                <View style={{ backgroundColor: isDark ? theme.dark.surfaceElevated : '#f1f5f9', padding: 12, borderRadius: 50 }}>
                  <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 16 }}>→</Text>
                </View>
              </View>
            </AppCard>
          </TouchableOpacity>
        </Link>

        {/* Neuro AI Link */}
        <Link href="/ai-chat" asChild>
          <TouchableOpacity style={{ marginBottom: theme.spacing.lg }}>
            <AppCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#ede9fe', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18 }}>🧠</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 18, fontWeight: '800' }}>Neuro AI</Text>
                  <Text style={{ color: textSecondary, fontSize: 13, marginTop: 3 }}>Ask questions about your health and doses</Text>
                </View>
                <View style={{ backgroundColor: isDark ? theme.dark.surfaceElevated : '#f1f5f9', padding: 12, borderRadius: 50 }}>
                  <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 16 }}>→</Text>
                </View>
              </View>
            </AppCard>
          </TouchableOpacity>
        </Link>

      </ScrollView>
    </AppScreen>
  );
}