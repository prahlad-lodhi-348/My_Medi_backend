import { DoseTimeInput, DoseUnit } from '@/src/types/phase2';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Conditionally import DateTimePicker only on native
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const UNITS: DoseUnit[] = ['TABLET', 'CAPSULE', 'ML'];

interface StepDosesProps {
  data: DoseTimeInput[];
  onNext: (data: DoseTimeInput[]) => void;
}

export default function StepDoses({ data, onNext }: StepDosesProps) {
  const [doses, setDoses] = useState<DoseTimeInput[]>(data);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<DoseTimeInput>>({
    time: '09:00:00',
    quantity: 1,
    unit: 'TABLET',
    label: '',
  });

  // Native time picker handler
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      setFormData({ ...formData, time: `${hours}:${minutes}:00` });
    }
  };

  // Web time input handler (HH:MM from <input type="time">)
  const handleWebTimeChange = (value: string) => {
    // value is "HH:MM", convert to "HH:MM:00"
    if (value) {
      setFormData({ ...formData, time: `${value}:00` });
    }
  };

  const handleAddDose = () => {
    setError(null);
    const { time, quantity, unit, label } = formData;

    if (!time) { setError('Time is required'); return; }
    if (!quantity || quantity <= 0) { setError('Quantity must be greater than 0'); return; }
    if (!label || !label.trim()) { setError('Label is required (e.g., Morning, Afternoon)'); return; }

    const newDose: DoseTimeInput = {
      time,
      quantity: Number(quantity),
      unit: unit as DoseUnit,
      label: label.trim(),
    };

    if (editingIndex !== null) {
      const updated = [...doses];
      updated[editingIndex] = newDose;
      setDoses(updated);
      setEditingIndex(null);
    } else {
      setDoses([...doses, newDose]);
    }

    setFormData({ time: '09:00:00', quantity: 1, unit: 'TABLET', label: '' });
  };

  const handleEditDose = (index: number) => {
    setFormData(doses[index]);
    setEditingIndex(index);
  };

  const handleRemoveDose = (index: number) => {
    Alert.alert('Remove Dose', 'Are you sure you want to remove this dose?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setDoses(doses.filter((_, i) => i !== index));
          if (editingIndex === index) {
            setEditingIndex(null);
            setFormData({ time: '09:00:00', quantity: 1, unit: 'TABLET', label: '' });
          }
        },
      },
    ]);
  };

  const handleNext = () => {
    setError(null);
    if (doses.length === 0) { setError('Add at least one dose time'); return; }
    onNext(doses);
  };

  // Convert "HH:MM:00" → "HH:MM" for web input value
  const timeForWebInput = (time: string) =>
    time ? time.substring(0, 5) : '09:00';

  const renderDoseItem = ({ item, index }: { item: DoseTimeInput; index: number }) => (
    <View style={styles.doseItem}>
      <View style={styles.doseInfo}>
        <Text style={styles.doseTime}>{item.time}</Text>
        <Text style={styles.doseLabel}>{item.label}</Text>
        <Text style={styles.doseQuantity}>{item.quantity} {item.unit}</Text>
      </View>
      <View style={styles.doseActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleEditDose(index)}>
          <FontAwesome name="edit" size={16} color="#0d9488" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => handleRemoveDose(index)}>
          <FontAwesome name="trash" size={16} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dosage Schedule</Text>

        {/* ── Time Input ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Time *</Text>

          {Platform.OS === 'web' ? (
            // Web: native HTML time input
            <input
              type="time"
              value={timeForWebInput(formData.time ?? '09:00:00')}
              onChange={(e) => handleWebTimeChange(e.target.value)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 14,
                backgroundColor: '#fff',
                color: '#1f2937',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          ) : (
            // Native: tap to open DateTimePicker
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeText}>{formData.time}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Native time picker (Android/iOS only) */}
        {Platform.OS !== 'web' && showTimePicker && DateTimePicker && (
          <DateTimePicker
            value={
              formData.time
                ? new Date(`2024-01-01T${formData.time}`)
                : new Date()
            }
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        {/* ── Quantity Input ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1"
            value={String(formData.quantity ?? '')}
            onChangeText={(text) =>
              setFormData({ ...formData, quantity: text ? parseFloat(text) : 1 })
            }
            keyboardType="numeric"
            placeholderTextColor="#d1d5db"
          />
        </View>

        {/* ── Unit Picker ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unit ?? 'TABLET'}
              onValueChange={(value: any) =>
                setFormData({ ...formData, unit: value as DoseUnit })
              }
              style={styles.picker}
            >
              {UNITS.map((u) => (
                <Picker.Item key={u} label={u} value={u} />
              ))}
            </Picker>
          </View>
        </View>

        {/* ── Label Input ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Label *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning, Afternoon, Evening"
            value={formData.label ?? ''}
            onChangeText={(text) => setFormData({ ...formData, label: text })}
            placeholderTextColor="#d1d5db"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.addButton} onPress={handleAddDose}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.addButtonText}>
            {editingIndex !== null ? 'Update Dose' : 'Add Dose'}
          </Text>
        </TouchableOpacity>

        {doses.length > 0 && (
          <View style={styles.dosesList}>
            <Text style={styles.listTitle}>Dose Times ({doses.length})</Text>
            <FlatList
              data={doses}
              renderItem={renderDoseItem}
              keyExtractor={(_, idx) => idx.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, doses.length === 0 && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={doses.length === 0}
        >
          <Text style={styles.buttonText}>Continue to Stock</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
  timeText: { fontSize: 14, color: '#1f2937' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: { height: 50 },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dosesList: { marginVertical: 20 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  doseItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#0d9488',
  },
  doseInfo: { flex: 1 },
  doseTime: { fontSize: 14, fontWeight: '600', color: '#0d9488' },
  doseLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  doseQuantity: { fontSize: 12, color: '#1f2937', fontWeight: '500', marginTop: 2 },
  doseActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 8 },
  button: {
    backgroundColor: '#0d9488',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
});