import { AppCard, AppScreen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/src/api/client";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { user, logout, isLoading: authLoading, loadUser, token } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    gender: "",
    date_of_birth: "",
    caregiver: "",
    caregiver_email: "",
    caregiver_phoneno: "",
    caregiver_relationship: "",
  });

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#ffffff" : "#1C1917";
  const textSecondary = isDark ? "#94a3b8" : "#78716C";
  const textMuted = isDark ? "#64748b" : "#A8A29E";
  const borderColor = isDark ? "#1f2937" : "#E7E5E4";
  const inputBg = isDark ? "#1f2937" : "#f9fafb";

  // Fresh data har baar screen open ho
  useFocusEffect(
    useCallback(() => {
      if (token) loadUser(token);
    }, [token])
  );

  const name = user?.username || "Guest";
  const emailVerified = user?.is_email_verified ?? false;
  const stepCount = user?.step_count ?? 0;
  const waterIntake = user?.water_intake ?? 0;
  const genderLabel =
    user?.gender === "M" ? "Male"
      : user?.gender === "F" ? "Female"
        : user?.gender === "O" ? "Other"
: null;

  const handleEditOpen = () => {
    setForm({
      phone: user?.phone || "",
      gender: user?.gender || "",
      date_of_birth: user?.date_of_birth || "",
      caregiver: user?.caregiver || "",
      caregiver_email: user?.caregiver_email || "",
      caregiver_phoneno: user?.caregiver_phoneno || "",
      caregiver_relationship: user?.caregiver_relationship || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("profile/", {
        method: "PATCH",
        token: token!,
        body: {
          phone: form.phone || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          caregiver: form.caregiver || null,
          caregiver_email: form.caregiver_email || null,
          caregiver_phoneno: form.caregiver_phoneno || null,
          caregiver_relationship: form.caregiver_relationship || null,
        },
      });
      await loadUser(token!);
      setEditing(false);
      if (Platform.OS === "web") {
        window.alert("Profile updated successfully!");
      } else {
        Alert.alert("✅ Saved", "Profile updated successfully!");
      }
    } catch (e) {
      console.error("Save error:", e);
      if (Platform.OS === "web") {
        window.alert("Could not save profile. Try again.");
      } else {
        Alert.alert("Error", "Could not save profile. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      setLoggingOut(true);
      try {
        await logout();
      } catch (e) {
        console.error("Logout error:", e);
      } finally {
        setLoggingOut(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) doLogout();
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (authLoading) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={{ color: textSecondary, marginTop: 12 }}>Loading profile...</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Profile Header */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: isDark ? "#0d9488" : "#ccfbf1",
            alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
          <Text style={{ color: textColor, fontSize: 24, fontWeight: "800" }}>{name}</Text>
          <View style={{
            marginTop: 8,
            backgroundColor: emailVerified
              ? (isDark ? "#064e3b" : "#d1fae5")
              : (isDark ? "#451a03" : "#fef3c7"),
            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
          }}>
            <Text style={{
              color: emailVerified
                ? (isDark ? "#6ee7b7" : "#059669")
                : (isDark ? "#fcd34d" : "#d97706"),
              fontSize: 12, fontWeight: "700",
            }}>
              {emailVerified ? "✓ Email Verified" : "⏳ Verification Pending"}
            </Text>
          </View>
        </View>

        {/* Health Stats */}
        <AppCard style={{ marginBottom: 20 }}>
          <Text style={{ color: textColor, fontSize: 18, fontWeight: "800", marginBottom: 16 }}>Health Stats</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>👟</Text>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: "800" }}>{stepCount.toLocaleString()}</Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>Steps Today</Text>
            </View>
            <View style={{ width: 1, backgroundColor: borderColor }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>💧</Text>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: "800" }}>{waterIntake}L</Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>Water Intake</Text>
            </View>
          </View>
        </AppCard>

        {/* Account Card — View Mode */}
        {!editing ? (
          <AppCard style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: "800" }}>Account</Text>
              <TouchableOpacity
                onPress={handleEditOpen}
                style={{ backgroundColor: isDark ? "#1f2937" : "#f1f5f9", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
              >
                <Text style={{ color: "#0d9488", fontWeight: "700", fontSize: 13 }}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: "Display Name", value: name },
              { label: "Email", value: user?.email },
              { label: "Phone", value: user?.phone },
              { label: "Age", value: user?.age ? `${user.age} years` : null },
              { label: "Gender", value: genderLabel },
              { label: "Date of Birth", value: user?.date_of_birth },
              {label :"caregiver ",value:user?.caregiver 
              }
            ].map((item, i, arr) =>
              item.value ? (
                <View key={item.label}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: textColor, fontSize: 16, fontWeight: "600" }}>{item.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 12 }} />}
                </View>
              ) : null
            )}

            <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 12 }} />
            <View>
              <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                Account Status
              </Text>
              <Text style={{ color: emailVerified ? "#059669" : "#d97706", fontSize: 16, fontWeight: "600" }}>
                {emailVerified ? "Active & Verified" : "Pending Email Verification"}
              </Text>
            </View>
          </AppCard>

        ) : (
          /* Edit Mode */
          <AppCard style={{ marginBottom: 20 }}>
            <Text style={{ color: textColor, fontSize: 18, fontWeight: "800", marginBottom: 20 }}>Edit Profile</Text>

            {/* Phone */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Phone
            </Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
              keyboardType="phone-pad"
              placeholder="+91 XXXXXXXXXX"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor,
              }}
            />

            {/* Gender */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Gender
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {[{ value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "O", label: "Other" }].map((g) => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setForm({ ...form, gender: g.value })}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: form.gender === g.value ? "#0d9488" : inputBg,
                    borderWidth: 1,
                    borderColor: form.gender === g.value ? "#0d9488" : borderColor,
                  }}
                >
                  <Text style={{ color: form.gender === g.value ? "#fff" : textSecondary, fontWeight: "600" }}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

{/* Date of Birth */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Date of Birth
            </Text>
            <TextInput
              value={form.date_of_birth}
              onChangeText={(v) => setForm({ ...form, date_of_birth: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor,
              }}
            />

{/* Caregiver Name */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Caregiver Name
            </Text>
            <TextInput
              value={form.caregiver}
              onChangeText={(v) => setForm({ ...form, caregiver: v })}
              placeholder="Enter caregiver name"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor,
              }}
            />

            {/* Caregiver Email */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Caregiver Email
            </Text>
            <TextInput
              value={form.caregiver_email}
              onChangeText={(v) => setForm({ ...form, caregiver_email: v })}
              placeholder="caregiver@example.com"
              keyboardType="email-address"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor,
              }}
            />

            {/* Caregiver Phone */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Caregiver Phone
            </Text>
            <TextInput
              value={form.caregiver_phoneno}
              onChangeText={(v) => setForm({ ...form, caregiver_phoneno: v })}
              placeholder="+91 XXXXXXXXXX"
              keyboardType="phone-pad"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor,
              }}
            />

            {/* Caregiver Relationship */}
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Relationship (e.g., Parent, Spouse)
            </Text>
            <TextInput
              value={form.caregiver_relationship}
              onChangeText={(v) => setForm({ ...form, caregiver_relationship: v })}
              placeholder="Enter relationship"
              placeholderTextColor={textMuted}
              style={{
                backgroundColor: inputBg, color: textColor,
                borderRadius: 10, padding: 12, marginBottom: 24,
                borderWidth: 1, borderColor,
              }}
            />

            {/* Save / Cancel */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={{ flex: 1, backgroundColor: inputBg, padding: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor }}
              >
                <Text style={{ color: textSecondary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ flex: 1, backgroundColor: saving ? "#9ca3af" : "#0d9488", padding: 14, borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        )}

        {/* About */}
        <AppCard style={{ marginBottom: 24 }}>
          <Text style={{ color: textColor, fontSize: 18, fontWeight: "800", marginBottom: 12 }}>About</Text>
          <Text style={{ color: textSecondary, fontSize: 14, lineHeight: 20 }}>
            Y Medi helps you track medications, monitor stock levels, and stay on schedule with your health regimen.
          </Text>
        </AppCard>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={{
            backgroundColor: loggingOut ? "#9ca3af" : "#ef4444",
            padding: 16, borderRadius: 14, alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
            {loggingOut ? "Logging out..." : "Log Out"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </AppScreen>
  );
}