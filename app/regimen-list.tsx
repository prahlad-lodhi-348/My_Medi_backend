import { AppScreen, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { listRegimens } from "@/src/api/phase2"; // ✅ phase2 API — coco bhi aayegi
import { Regimen } from "@/src/types/phase2";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegimenListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Regimen[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const data = await listRegimens();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load medicines");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0d9488" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>YOUR MEDICINES</Text>
            <Text style={styles.headerTitle}>
              {items.length} Medicine{items.length !== 1 ? 's' : ''} Tracked
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/wizard/step-medicine")}
            style={styles.addButton}
          >
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing && <LoadingState message="Loading medicines..." />}
        {!!err && <ErrorState message={err} onRetry={() => load()} />}

        {!loading && !err && items.length === 0 && (
          <EmptyState
            icon="💊"
            title="No medicines yet"
            subtitle="Add your first medicine using the + Add button."
          />
        )}

        {/* Medicine Cards */}
        {items.map((r) => {
          const isLowStock = r.stock
            ? Number(r.stock.current_quantity) < 10
            : false;

          return (
            <TouchableOpacity
              key={r.id}
              onPress={() =>
                router.push({
                  pathname: "/regimen-detail",
                  params: { regimenId: String(r.id) },
                })
              }
              style={styles.card}
            >
              {/* Icon + Info */}
              <View style={styles.cardRow}>
                <View style={styles.iconBox}>
                  <Text style={styles.iconText}>💊</Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.medicineName}>{r.medicine.name}</Text>
                  <Text style={styles.medicineDetail}>
                    {r.medicine.strength} • {r.medicine.form}
                  </Text>
                  <Text style={styles.medicineDetail}>
                    {r.dose_times.length} dose{r.dose_times.length !== 1 ? 's' : ''}/day
                    {r.stock ? ` • Stock: ${r.stock.current_quantity} ${r.stock.unit}` : ''}
                  </Text>
                </View>

                {/* Low stock warning */}
                {isLowStock && (
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningText}>⚠️</Text>
                  </View>
                )}
              </View>

              {/* Start date */}
              <Text style={styles.startDate}>
                Started {r.start_date}
                {r.end_date ? ` → ${r.end_date}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d9488",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  medicineDetail: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 3,
  },
  warningBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  warningText: {
    fontSize: 16,
  },
  startDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
});