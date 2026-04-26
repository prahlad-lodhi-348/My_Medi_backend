import { ApiError, apiError } from '@/src/api/client';
import { createRegimenWizard } from '@/src/api/phase2';
import { RegimenWizardPayload } from '@/src/types/phase2';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Conditionally import DateTimePicker only on native
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface StepReviewProps {
  data: RegimenWizardPayload;
  onDateChange: (date: string) => void;
  onEndDateChange?: (date: string | null) => void;
}

export default function StepReview({ data, onDateChange, onEndDateChange }: StepReviewProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(!!data.end_date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Native date picker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      onDateChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate && onEndDateChange) {
      onEndDateChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  // Toggle end date
  const handleEndDateToggle = (value: boolean) => {
    setHasEndDate(value);
    if (!value && onEndDateChange) {
      onEndDateChange(null);
    } else if (value && onEndDateChange && !data.end_date) {
      // Default end date = 30 days from start
      const d = new Date(data.start_date);
      d.setDate(d.getDate() + 30);
      onEndDateChange(d.toISOString().split('T')[0]);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      setLoading(true);
      await createRegimenWizard(data);
      Alert.alert('Success!', 'Medicine regimen created successfully.', [
        { text: 'View My Medicines', onPress: () => router.replace('/regimen-list') },
      ]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : apiError(err) || 'Failed to create regimen';
      setError(message);
      console.error('Error creating regimen:', err);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const startDate = new Date(data.start_date);
  const endDate = data.end_date ? new Date(data.end_date) : new Date();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <FontAwesome name="check-circle" size={32} color="#10b981" />
          <Text style={styles.title}>Review Your Regimen</Text>
        </View>

        {/* Medicine Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicine</Text>
          <View style={styles.card}>
            <Row label="Name" value={data.medicine.name} />
            <Row label="Strength" value={data.medicine.strength} />
            <Row label="Form" value={data.medicine.form} />
            {data.medicine.notes && <Row label="Notes" value={data.medicine.notes} />}
          </View>
        </View>

        {/* Dosage Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage Schedule</Text>
          {data.dose_times.map((dose, idx) => (
            <View key={idx} style={styles.card}>
              <Row label={dose.label} value={`${dose.time} — ${dose.quantity} ${dose.unit}`} />
            </View>
          ))}
        </View>

        {/* Stock Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Information</Text>
          <View style={styles.card}>
            <Row label="Current Stock" value={`${data.stock.current_quantity} ${data.stock.unit}`} />
            <Row label="Low Stock Alert" value={`After ${data.stock.low_stock_threshold_days} days`} />
          </View>
        </View>

        {/* ── Start Date ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>

          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={data.start_date}
              onChange={(e) => onDateChange(e.target.value)}
              style={webInputStyle}
            />
          ) : (
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <FontAwesome name="calendar" size={16} color="#0d9488" />
              <Text style={styles.dateButtonText}>{data.start_date}</Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && showStartPicker && DateTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="spinner"
              onChange={handleStartDateChange}
            />
          )}
        </View>

        {/* ── End Date (Optional) ── */}
        <View style={styles.section}>
          <View style={styles.endDateHeader}>
            <Text style={styles.sectionTitle}>End Date</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{hasEndDate ? 'Set' : 'No end date'}</Text>
              <Switch
                value={hasEndDate}
                onValueChange={handleEndDateToggle}
                trackColor={{ false: '#d1d5db', true: '#0d9488' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {hasEndDate && (
            <>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={data.end_date ?? ''}
                  min={data.start_date}
                  onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
                  style={webInputStyle}
                />
              ) : (
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                  <FontAwesome name="calendar" size={16} color="#0d9488" />
                  <Text style={styles.dateButtonText}>{data.end_date ?? 'Pick end date'}</Text>
                </TouchableOpacity>
              )}

              {Platform.OS !== 'web' && showEndPicker && DateTimePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  minimumDate={startDate}
                  onChange={handleEndDateChange}
                />
              )}
            </>
          )}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="plus" size={16} color="#fff" />
              <Text style={styles.buttonText}>Create Regimen</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          You can edit or delete this regimen anytime from your medicine list.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Small helper component
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// Web date input style (plain JS object for inline style)
const webInputStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 14,
  backgroundColor: '#fff',
  color: '#1f2937',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginTop: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 13, fontWeight: '500', color: '#6b7280', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#0d9488', textAlign: 'right', flex: 1 },
  endDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, color: '#6b7280' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateButtonText: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginVertical: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  button: {
    flexDirection: 'row',
    backgroundColor: '#0d9488',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});