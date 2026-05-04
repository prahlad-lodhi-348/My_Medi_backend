import { AppCard, AppScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/src/api/client";
import { theme } from "@/src/theme";
import { CalendarRange, Regimen } from "@/src/types/phase2";
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { playReminderVoice, stopSpeech } from '../../utils/voice';

function fmtDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [regimens, setRegimens] = useState<Regimen[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarRange | null>(null);
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

  const today = fmtDate(new Date());

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await api<Regimen[]>("regimens/", { token });
        setRegimens(data);
      } catch (error) {
        console.error('Failed to fetch regimens', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  // Load today's calendar for all regimens
  useEffect(() => {
    const loadCalendar = async () => {
      if (!token || regimens.length === 0) return;
      try {
        // Get calendar for first regimen (or could iterate all)
        const regimenId = regimens[0].id;
        const start = today;
        const end = today;
        const data = await api<CalendarRange>(`regimens/${regimenId}/calendar/?start=${start}&end=${end}`, { token });
        setCalendarData(data);
      } catch (error) {
        console.error('Failed to load calendar', error);
      }
    };
    loadCalendar();
  }, [token, regimens]);

  // Get next pending dose
  const nextPendingDose = (() => {
    if (!calendarData || !calendarData[today]) return null;
    const todayDoses = calendarData[today].doses;
    const pending = todayDoses.find(d => d.status === 'PENDING');
    if (!pending) return null;
    const regimen = regimens.find(r => r.dose_times.some(dt => dt.id === pending.dose_time_id));
    return {
      name: regimen?.medicine.name || 'Medicine',
      dose: `${pending.quantity} ${pending.unit}`,
      time: pending.time?.slice(0, 5) || 'Upcoming',
      strength: regimen?.medicine.strength || '',
      doseTimeId: pending.dose_time_id,
    };
  })();

  // Get today's doses for summary
  const todayDosesSummary = (() => {
    if (!calendarData || !calendarData[today]) return { taken: 0, skipped: 0, pending: 0 };
    const doses = calendarData[today].doses;
    return {
      taken: doses.filter(d => d.status === 'TAKEN').length,
      skipped: doses.filter(d => d.status === 'SKIPPED').length,
      pending: doses.filter(d => d.status === 'PENDING').length,
    };
  })();

const handleListen = async () => {
    if (!nextPendingDose || !token) return;
    setIsSpeaking(true);
    try {
      playReminderVoice(userName, nextPendingDose.name, nextPendingDose.strength || '');
      setTimeout(() => setIsSpeaking(false), 4000);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

const handleStopSpeech = () => { stopSpeech(); setIsSpeaking(false); };

  // Mark dose as taken
  const markAsTaken = async (regimenId: number, doseTimeId: number, date: string) => {
    if (!token) return;
    try {
      await api("intakes/", {
        method: "POST",
        token,
        body: { regimen: regimenId, dose_time: doseTimeId, date, status: "TAKEN" },
      });
      // Reload calendar
      const data = await api<CalendarRange>(`regimens/${regimenId}/calendar/?start=${today}&end=${today}`, { token });
      setCalendarData(data);
    } catch (error) {
      console.error("Failed to mark as taken", error);
    }
  };

  // Mark dose as skipped
  const markAsSkipped = async (regimenId: number, doseTimeId: number, date: string) => {
    if (!token) return;
    try {
      await api("intakes/", {
        method: "POST",
        token,
        body: { regimen: regimenId, dose_time: doseTimeId, date, status: "SKIPPED" },
      });
      // Reload calendar
      const data = await api<CalendarRange>(`regimens/${regimenId}/calendar/?start=${today}&end=${today}`, { token });
      setCalendarData(data);
    } catch (error) {
      console.error("Failed to mark as skipped", error);
    }
  };

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
          ) : nextPendingDose ? (
            <>
              <Text style={{ color: textColor, fontSize: 30, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 }}>{nextPendingDose.name}</Text>
              <Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500', marginTop: 2 }}>{nextPendingDose.dose}</Text>
              {nextPendingDose.strength && (
                <View style={{ backgroundColor: isDark ? theme.dark.surfaceElevated : '#f8fafc', borderRadius: theme.radius.lg, padding: 14, marginTop: 14 }}>
                  <Text style={{ color: textColor, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>💊 Strength</Text>
                  <Text style={{ color: textSecondary, fontSize: 13, lineHeight: 20 }}>{nextPendingDose.strength}</Text>
                </View>
              )}
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.info, marginRight: 6 }} />
                  <Text style={{ color: theme.colors.info, fontWeight: '700', fontSize: 15 }}>{nextPendingDose.time}</Text>
                </View>
                <TouchableOpacity onPress={isSpeaking ? handleStopSpeech : handleListen} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isSpeaking ? (isDark ? '#1f1115' : '#fef2f2') : (isDark ? '#101520' : '#eff6ff'), paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 }}>
                  <Text style={{ fontSize: 16, marginRight: 5 }}>{isSpeaking ? '⏹' : '🔊'}</Text>
                  <Text style={{ color: isSpeaking ? theme.colors.danger : theme.colors.info, fontWeight: '700', fontSize: 13 }}>{isSpeaking ? 'Stop' : 'Listen'}</Text>
                </TouchableOpacity>
              </View>
              {/* Taken/Skipped buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => nextPendingDose && markAsTaken(regimens[0]?.id, nextPendingDose.doseTimeId, today)}
                  style={{ flex: 1, backgroundColor: theme.colors.success, padding: 12, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✅ Mark Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => nextPendingDose && markAsSkipped(regimens[0]?.id, nextPendingDose.doseTimeId, today)}
                  style={{ flex: 1, backgroundColor: '#f59e0b', padding: 12, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>❌ Mark Skipped</Text>
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

        {/* Today's Doses Summary - Taken/Skipped */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
          <AppCard style={{ width: '48%', padding: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
              <Text style={{ color: textColor, fontSize: 22, fontWeight: '800' }}>{todayDosesSummary.taken}</Text>
            </View>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Taken</Text>
            <Text style={{ color: theme.colors.success, fontSize: 11, fontWeight: '600', marginTop: 4 }}>Today</Text>
          </AppCard>
          <AppCard style={{ width: '48%', padding: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>❌</Text>
              <Text style={{ color: textColor, fontSize: 22, fontWeight: '800' }}>{todayDosesSummary.skipped}</Text>
            </View>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Skipped</Text>
            <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600', marginTop: 4 }}>Today</Text>
          </AppCard>
        </View>

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