import { apiGet } from "@/src/api/client";
import { AppScreen, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColorScheme } from "react-native";

interface Medicine {
  id?: number | string;
  name: string;
  dosage?: string;
  time?: string;
  how_it_works?: string;
  side_effects?: string;
  image?: string;
  [key: string]: any;
}

export default function MedicineList() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#ffffff" : "#1C1917";
  const textSecondary = isDark ? "#94a3b8" : "#78716C";
  const textMuted = isDark ? "#64748b" : "#A8A29E";
  const borderColor = isDark ? "#1f2937" : "#E7E5E4";

  const loadMedicines = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const data = await apiGet<Medicine[]>("/medicines/");
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setMedicines(list);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to load medicines";
      setError(errorMsg);
      console.error("Error loading medicines:", e);
      setMedicines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const renderItem = ({ item }: { item: Medicine }) => (
    <View style={{ backgroundColor: isDark ? "#0b1220" : "#fff", borderRadius: 24, padding: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor }}>
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={{ width: 64, height: 64, borderRadius: 16, marginRight: 16 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: isDark ? "#111827" : "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
          <Text style={{ fontSize: 28 }}>💊</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ color: textColor, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.dosage && (
          <Text style={{ color: textSecondary, fontSize: 14, marginTop: 2 }}>{item.dosage}</Text>
        )}
        {item.time && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb", marginRight: 6 }} />
            <Text style={{ color: "#2563eb", fontSize: 13, fontWeight: "700" }}>{item.time}</Text>
          </View>
        )}
      </View>

      {item.side_effects && (
        <View style={{ backgroundColor: isDark ? "#1f1115" : "#fee2e2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
          <Text style={{ color: isDark ? "#fca5a5" : "#dc2626", fontSize: 11, fontWeight: "700" }}>⚠️</Text>
        </View>
      )}
    </View>
  );

  return (
    <AppScreen>
      <Stack.Screen
        options={{
          title: "Medicine Inventory",
          headerStyle: { backgroundColor: isDark ? "#000" : "#fafafa" },
          headerTintColor: isDark ? "#fff" : "#0d9488",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />

      {loading && !refreshing ? (
        <LoadingState message="Loading medicines..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadMedicines()} />
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => String(item.id || item.name)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMedicines(true)}
              tintColor="#0d9488"
            />
          }
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>
                Your Medicines
              </Text>
              <Text style={{ color: textColor, fontSize: 24, fontWeight: "800" }}>
                {medicines.length} {medicines.length === 1 ? "Medicine" : "Medicines"} Tracked
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <EmptyState
              icon="📭"
              title="No medicines added yet"
              subtitle="Tap the + button on the dashboard to add your first medicine."
            />
          )}
        />
      )}
    </AppScreen>
  );
}
