import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { CalendarRangeResponse, getRegimenCalendar, intakeUpsert } from "../services/api";

function fmtDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CalendarScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ regimenId?: string }>();
  const regimenId = useMemo(() => Number(params.regimenId ?? 0), [params.regimenId]);

  const [data, setData] = useState<CalendarRangeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useMemo(() => fmtDate(new Date()), []);
  const end = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 6);
    return fmtDate(d);
  }, []);

  const load = async () => {
    if (!token || !regimenId) return;
    setLoading(true);
    try {
      const res = await getRegimenCalendar(token, regimenId, start, end);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, regimenId]);

  const mark = async (date: string, dose_time: number, status: "TAKEN" | "SKIPPED") => {
    if (!token || !regimenId) return;
    await intakeUpsert(token, { regimen: regimenId, dose_time, date, status });
    await load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>Calendar</Text>
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>{start} → {end}</Text>

        {loading && <ActivityIndicator color="#0d9488" style={{ marginTop: 16 }} />}

        {!loading && data && Object.keys(data).map((dateKey) => {
          const day = data[dateKey];
          return (
            <View key={dateKey} style={{ marginTop: 14, backgroundColor: "#0b1220", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#1f2937" }}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>{dateKey} • {day.day}</Text>

              {day.doses.map((dose) => (
                <View key={`${dateKey}-${dose.dose_time_id}`} style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: "#111827" }}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    {dose.time} • {dose.quantity} {dose.unit}
                  </Text>
                  <Text style={{ color: "#94a3b8", marginTop: 4 }}>Status: {dose.status}</Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => mark(dateKey, dose.dose_time_id, "TAKEN")}
                      style={{ flex: 1, backgroundColor: "#16a34a", padding: 10, borderRadius: 12 }}
                    >
                      <Text style={{ textAlign: "center", color: "#fff", fontWeight: "900" }}>Taken</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => mark(dateKey, dose.dose_time_id, "SKIPPED")}
                      style={{ flex: 1, backgroundColor: "#f59e0b", padding: 10, borderRadius: 12 }}
                    >
                      <Text style={{ textAlign: "center", color: "#111", fontWeight: "900" }}>Skipped</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}