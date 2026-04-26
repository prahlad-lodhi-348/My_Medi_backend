import { useAuth } from "@/context/AuthContext";
import { getRegimen, getStockStatus, reorderResponse, restock, updateStock } from "@/src/api/phase2";
import { Regimen, StockStatus } from "@/src/types/phase2";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegimenDetailScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ regimenId?: string }>();
  const regimenId = useMemo(() => Number(params.regimenId ?? 0), [params.regimenId]);

  const [regimen, setRegimen] = useState<Regimen | null>(null);
  const [status, setStatus] = useState<StockStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [qty, setQty] = useState("10");
  const [addQty, setAddQty] = useState("10");

  const load = async (isRefresh = false) => {
    if (!regimenId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await getRegimen(regimenId);
      setRegimen(r);
      const st = await getStockStatus(regimenId);
      setStatus(st);
      setQty(String(Math.round(Number(st.current_quantity))));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [regimenId]);

  const unit = regimen?.stock?.unit ?? "TABLET";

  const onUpdateStock = async () => {
    if (!regimenId) return;
    await updateStock(regimenId, Number(qty), unit);
    await load();
  };

  const onRestock = async () => {
    if (!regimenId) return;
    await restock(regimenId, Number(addQty));
    await load();
  };

  const onReorder = async (ordered: boolean) => {
    if (!regimenId) return;
    await reorderResponse(regimenId, ordered);
    await load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0d9488" />
        }
      >
        {loading && !refreshing && (
          <ActivityIndicator color="#0d9488" style={{ marginVertical: 20 }} />
        )}

        {regimen && (
          <>
            {/* Header */}
            <Text style={styles.medicineName}>
              {regimen.medicine.name} • {regimen.medicine.strength}
            </Text>
            <Text style={styles.medicineSubtitle}>
              {regimen.medicine.form} • Start {regimen.start_date}
              {regimen.end_date ? ` • End ${regimen.end_date}` : ''}
            </Text>

            {/* Open Calendar */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/calendar", params: { regimenId: String(regimenId) } })}
              style={styles.calendarButton}
            >
              <Text style={styles.calendarButtonText}>Open Calendar</Text>
            </TouchableOpacity>

            {/* Stock Status */}
            {status && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Stock Status</Text>
                <Text style={[styles.daysRemaining, { color: status.is_low_stock ? "#dc2626" : "#16a34a" }]}>
                  {status.days_remaining} days remaining
                </Text>
                <Text style={styles.stockDetail}>
                  Current: {status.current_quantity} {status.unit} • Avg/day: {status.avg_daily_required}
                </Text>
              </View>
            )}

            {/* Set Stock Quantity */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set Stock Quantity ({unit})</Text>
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={onUpdateStock} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Update</Text>
              </TouchableOpacity>
            </View>

            {/* Restock */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Restock (+{unit})</Text>
              <TextInput
                value={addQty}
                onChangeText={setAddQty}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={onRestock} style={styles.restockButton}>
                <Text style={styles.primaryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Reorder Response */}
            <View style={styles.reorderRow}>
              <TouchableOpacity onPress={() => onReorder(true)} style={styles.orderedButton}>
                <Text style={styles.primaryButtonText}>Ordered</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onReorder(false)} style={styles.notNowButton}>
                <Text style={styles.primaryButtonText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  medicineName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
  },
  medicineSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
  },
  calendarButton: {
    marginTop: 14,
    backgroundColor: "#0d9488",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  calendarButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  daysRemaining: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
  },
  stockDetail: {
    color: "#6b7280",
    marginTop: 6,
    fontSize: 13,
  },
  input: {
    marginTop: 12,
    backgroundColor: "#f3f4f6",
    color: "#111827",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#0d9488",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  restockButton: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  reorderRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  orderedButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  notNowButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
});