import { AppScreen, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useColorScheme } from "react-native";
import { lowStockAlerts } from "../services/api";

interface AlertItem {
  id?: number | string;
  medicine_name?: string;
  medicine?: string;
  days_remaining?: number;
  current_quantity?: number;
  unit?: string;
  threshold_days?: number;
  is_acknowledged?: boolean;
  [key: string]: any;
}

export default function AlertsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#ffffff" : "#1C1917";
  const textSecondary = isDark ? "#94a3b8" : "#78716C";
  const borderColor = isDark ? "#1f2937" : "#E7E5E4";

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const res = await lowStockAlerts(token);
      const arr = Array.isArray(res) ? res : (res as any)?.value ?? (res as any)?.results ?? [];
      setItems(arr);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0d9488" />
        }
      >
        <Text style={{ color: textColor, fontSize: 22, fontWeight: "900", marginBottom: 16 }}>Stock Alerts</Text>

        {loading && !refreshing && <LoadingState message="Loading alerts..." />}

        {!!err && <ErrorState message={err} onRetry={() => load()} />}

        {!loading && !err && items.length === 0 && (
          <EmptyState
            icon="✅"
            title="No low stock alerts"
            subtitle="All your medicines have sufficient stock."
          />
        )}

        {items.map((a, idx) => (
          <View
            key={String(a?.id ?? idx)}
            style={{
              marginTop: 12,
              backgroundColor: isDark ? "#0b1220" : "#fff",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text style={{ color: textColor, fontWeight: "900", fontSize: 16 }}>
              {a?.medicine_name ?? a?.medicine ?? "Low stock"}
            </Text>

            {(a?.days_remaining !== undefined || a?.current_quantity !== undefined) && (
              <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
                {a?.days_remaining !== undefined && (
                  <View style={{ backgroundColor: isDark ? "#1f1115" : "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: isDark ? "#fcd34d" : "#d97706", fontSize: 12, fontWeight: "700" }}>
                      {a.days_remaining} days left
                    </Text>
                  </View>
                )}
                {a?.current_quantity !== undefined && (
                  <View style={{ backgroundColor: isDark ? "#111827" : "#f3f4f6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "600" }}>
                      Qty: {a.current_quantity} {a?.unit ?? ""}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {a?.threshold_days !== undefined && (
              <Text style={{ color: textSecondary, fontSize: 13, marginTop: 8 }}>
                Threshold: {a.threshold_days} days
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
