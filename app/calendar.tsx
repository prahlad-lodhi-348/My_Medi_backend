import { useAuth } from "@/context/AuthContext";
import { getCalendar, recordIntake } from "@/src/api/phase2";
import { CalendarRange, IntakeStatus } from "@/src/types/phase2";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function fmtDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateKey: string): string {
  try {
    const d = new Date(dateKey + "T00:00:00Z");
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return dateKey;
  }
}

const STATUS_COLORS: Record<IntakeStatus, { bg: string; text: string; border: string }> = {
  TAKEN: { bg: "#16a34a", text: "#fff", border: "#15803d" },
  SKIPPED: { bg: "#f59e0b", text: "#111", border: "#d97706" },
  PENDING: { bg: "#1f2937", text: "#94a3b8", border: "#374151" },
};

export default function CalendarScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ regimenId?: string }>();
  const regimenId = useMemo(() => Number(params.regimenId ?? 0), [params.regimenId]);

  const [data, setData] = useState<CalendarRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  // marking: key = `${date}__${dose_time_id}` → true while in-flight
  const [marking, setMarking] = useState<Record<string, boolean>>({});

  const start = useMemo(() => fmtDate(new Date()), []);
  const end = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 6);
    return fmtDate(d);
  }, []);

  const dataRef = useRef(data);
  dataRef.current = data;

  const load = async () => {
    if (!regimenId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await getCalendar(regimenId, start, end);
      setData(res);
    } catch (e: any) {
      setLoadErr(e?.message ?? "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token, regimenId]);

  const mark = async (
    dateKey: string,
    dose_time_id: number,
    status: "TAKEN" | "SKIPPED"
  ) => {
    if (!regimenId) return;
    const key = `${dateKey}__${dose_time_id}`;
    if (marking[key]) return; // prevent double-tap

    // ── Optimistic update ──
    const prev = dataRef.current;
    setData((cur) => {
      if (!cur) return cur;
      const day = cur[dateKey];
      if (!day) return cur;
      return {
        ...cur,
        [dateKey]: {
          ...day,
          doses: day.doses.map((d) =>
            d.dose_time_id === dose_time_id ? { ...d, status } : d
          ),
        },
      };
    });

    setMarking((m) => ({ ...m, [key]: true }));
    try {
      await recordIntake({ regimen: regimenId, dose_time: dose_time_id, date: dateKey, status });
    } catch {
      // Revert on failure
      setData(prev);
    } finally {
      setMarking((m) => { const n = { ...m }; delete n[key]; return n; });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            7-DAY VIEW
          </Text>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>Calendar</Text>
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            {start} → {end}
          </Text>
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator color="#0d9488" size="large" />
            <Text style={{ color: "#64748b", marginTop: 10 }}>Loading schedule...</Text>
          </View>
        )}

        {/* Error */}
        {!!loadErr && !loading && (
          <View style={{ backgroundColor: "#1f1115", borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: "#ef4444", marginBottom: 16 }}>
            <Text style={{ color: "#fca5a5", fontWeight: "700" }}>{loadErr}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 10 }}>
              <Text style={{ color: "#0d9488", fontWeight: "700" }}>Retry →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No regimenId fallback */}
        {!regimenId && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 }}>No regimen selected</Text>
            <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>
              Open a medicine from your schedule to view its calendar.
            </Text>
          </View>
        )}

        {/* Calendar days */}
        {!loading && data && Object.keys(data).map((dateKey) => {
          const day = data[dateKey];
          const isToday = dateKey === start;

          return (
            <View
              key={dateKey}
              style={{
                marginBottom: 16,
                backgroundColor: "#0b1220",
                borderRadius: 18,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: isToday ? "#0d9488" : "#1f2937",
              }}
            >
              {/* Day header */}
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: isToday ? "#0d948820" : "#111827",
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: "#1f2937",
              }}>
                {isToday && (
                  <View style={{ backgroundColor: "#0d9488", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>TODAY</Text>
                  </View>
                )}
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                  {formatDisplayDate(dateKey)}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>
                  • {day.doses.length} dose{day.doses.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Doses */}
              {day.doses.map((dose) => {
                const key = `${dateKey}__${dose.dose_time_id}`;
                const isMarking = marking[key] ?? false;
                const statusColors = STATUS_COLORS[dose.status] ?? STATUS_COLORS.PENDING;

                return (
                  <View
                    key={key}
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: "#1f2937",
                    }}
                  >
                    {/* Dose info */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <View>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                          {dose.time.slice(0, 5)} — {dose.quantity} {dose.unit}
                        </Text>
                        <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                          {dose.label || "Dose"}
                        </Text>
                      </View>

                      {/* Status badge */}
                      <View style={{
                        backgroundColor: statusColors.bg,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderWidth: 1,
                        borderColor: statusColors.border,
                      }}>
                        <Text style={{ color: statusColors.text, fontSize: 12, fontWeight: "800" }}>
                          {dose.status}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => mark(dateKey, dose.dose_time_id, "TAKEN")}
                        disabled={isMarking || dose.status === "TAKEN"}
                        style={{
                          flex: 1,
                          backgroundColor: dose.status === "TAKEN" ? "#15803d" : "#166534",
                          paddingVertical: 11,
                          borderRadius: 12,
                          alignItems: "center",
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 6,
                          opacity: isMarking ? 0.5 : 1,
                          borderWidth: 1,
                          borderColor: dose.status === "TAKEN" ? "#16a34a" : "#1a6b3a",
                        }}
                      >
                        {isMarking && dose.status !== "TAKEN" ? (
                          <ActivityIndicator size={14} color="#fff" />
                        ) : (
                          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "900" }}>
                            {dose.status === "TAKEN" ? "✓ Taken" : "Mark Taken"}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => mark(dateKey, dose.dose_time_id, "SKIPPED")}
                        disabled={isMarking || dose.status === "SKIPPED"}
                        style={{
                          flex: 1,
                          backgroundColor: dose.status === "SKIPPED" ? "#d97706" : "#1f2937",
                          paddingVertical: 11,
                          borderRadius: 12,
                          alignItems: "center",
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 6,
                          opacity: isMarking ? 0.5 : 1,
                          borderWidth: 1,
                          borderColor: dose.status === "SKIPPED" ? "#f59e0b" : "#374151",
                        }}
                      >
                        {isMarking && dose.status !== "SKIPPED" ? (
                          <ActivityIndicator size={14} color="#fff" />
                        ) : (
                          <Text style={{ color: dose.status === "SKIPPED" ? "#111" : "#94a3b8", fontSize: 13, fontWeight: "900" }}>
                            {dose.status === "SKIPPED" ? "✗ Skipped" : "Mark Skipped"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}