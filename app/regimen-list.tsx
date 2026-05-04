import { AppScreen, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { deleteRegimen, listRegimens } from "@/src/api/phase2";
import { Regimen } from "@/src/types/phase2";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

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

  const handleDelete = (regimen: Regimen) => {
    Alert.alert(
      "Delete Regimen",
      `Remove ${regimen.medicine.name} from your schedule? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingIds((prev) => new Set(prev).add(regimen.id));
            // Optimistic removal
            setItems((prev) => prev.filter((r) => r.id !== regimen.id));
            try {
              await deleteRegimen(regimen.id);
            } catch (e: any) {
              // Revert on failure
              setItems((prev) => [...prev, regimen].sort((a, b) => a.id - b.id));
              Alert.alert("Error", e?.message ?? "Failed to delete. Please try again.");
            } finally {
              setDeletingIds((prev) => {
                const next = new Set(prev);
                next.delete(regimen.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

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
          const isDeleting = deletingIds.has(r.id);

          return (
            <TouchableOpacity
              key={r.id}
              onPress={() =>
                router.push({
                  pathname: "/regimen-detail",
                  params: { regimenId: String(r.id) },
                })
              }
              style={[styles.card, isLowStock && styles.cardLowStock]}
              activeOpacity={0.85}
            >
              {/* Icon + Info + Delete */}
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

                <View style={styles.cardActions}>
                  {/* Low stock warning badge */}
                  {isLowStock && (
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningText}>⚠️</Text>
                    </View>
                  )}

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDelete(r)}
                    disabled={isDeleting}
                    style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size={14} color="#fff" />
                    ) : (
                      <FontAwesome name="trash" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
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
  cardLowStock: {
    borderColor: "#fde68a",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
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
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
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
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnDisabled: {
    backgroundColor: "#fca5a5",
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