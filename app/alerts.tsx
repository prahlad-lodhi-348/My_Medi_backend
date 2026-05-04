import { AppScreen, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { getLowStockAlerts } from "@/src/api/phase2";
import { LowStockAlert } from "@/src/types/phase2";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

function computeOutOfStockDate(daysRemaining: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(daysRemaining));
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AlertsScreen() {
  const [items, setItems] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#000" : "#f9fafb";
  const cardBg = isDark ? "#0b1220" : "#fff";
  const textColor = isDark ? "#fff" : "#111827";
  const textSecondary = isDark ? "#94a3b8" : "#6b7280";
  const border = isDark ? "#1f2937" : "#f3f4f6";

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const res = await getLowStockAlerts();
      const arr = Array.isArray(res) ? res : [];
      // Compute out-of-stock date client-side
      const enriched = arr.map((a) => ({
        ...a,
        estimated_out_of_stock_date:
          a.days_remaining != null
            ? computeOutOfStockDate(a.days_remaining)
            : undefined,
      }));
      setItems(enriched);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReorder = (url: string) => {
    Alert.alert(
      "Open Reorder Link",
      "This will open a browser to place a reorder. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open", onPress: () => Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link")) },
      ]
    );
  };

  return (
    <AppScreen>
      <ScrollView
        style={{ backgroundColor: bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ef4444" />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: isDark ? "#64748b" : "#9ca3af", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            STOCK MONITORING
          </Text>
          <Text style={{ color: textColor, fontSize: 26, fontWeight: "900" }}>
            Stock Alerts
          </Text>
          {items.length > 0 && (
            <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600", marginTop: 4 }}>
              {items.length} medicine{items.length !== 1 ? "s" : ""} running low
            </Text>
          )}
        </View>

        {loading && !refreshing && <LoadingState message="Loading alerts..." />}
        {!!err && <ErrorState message={err} onRetry={() => load()} />}

        {!loading && !err && items.length === 0 && (
          <EmptyState
            icon="✅"
            title="All stocked up!"
            subtitle="No medicines are running low right now."
          />
        )}

        {items.map((a, idx) => (
          <View
            key={String(a?.id ?? idx)}
            style={{
              marginBottom: 14,
              backgroundColor: cardBg,
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: border,
              borderLeftWidth: 4,
              borderLeftColor: "#ef4444",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Medicine name + badge */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#1f1115" : "#fef2f2",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 22 }}>🔴</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textColor, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
                    {a?.medicine_name ?? "Low stock"}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Threshold: {a.threshold_days} days
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#fecaca" }}>
                <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "800" }}>LOW</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {/* Current stock */}
              <View style={{ backgroundColor: isDark ? "#111827" : "#f3f4f6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flex: 1 }}>
                <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Current Stock</Text>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "800" }}>
                  {a.current_quantity} {a.unit}
                </Text>
              </View>

              {/* Days remaining */}
              <View style={{ backgroundColor: isDark ? "#1f1115" : "#fffbeb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flex: 1 }}>
                <Text style={{ color: isDark ? "#fcd34d" : "#d97706", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Days Left</Text>
                <Text style={{ color: isDark ? "#fbbf24" : "#d97706", fontSize: 15, fontWeight: "800" }}>
                  {a.days_remaining != null ? `${Math.round(a.days_remaining)} days` : "—"}
                </Text>
              </View>
            </View>

            {/* Out of stock date */}
            {a.estimated_out_of_stock_date && (
              <View style={{ backgroundColor: isDark ? "#1f1115" : "#fef2f2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 }}>
                <Text style={{ color: isDark ? "#fca5a5" : "#dc2626", fontSize: 13, fontWeight: "700" }}>
                  📅 Estimated out of stock: {a.estimated_out_of_stock_date}
                </Text>
              </View>
            )}

            {/* Reorder button */}
            {!!a.reorder_url && (
              <TouchableOpacity
                onPress={() => handleReorder(a.reorder_url!)}
                style={{
                  backgroundColor: "#2563eb",
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>🛒</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                  Reorder Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
