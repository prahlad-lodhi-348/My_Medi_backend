import { createMedicineWithImage, getMedicines } from '@/src/api/phase2';
import { Medicine, MedicineForm, MedicineInput } from '@/src/types/phase2';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const FORMS: MedicineForm[] = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'LIQUID'];

type Mode = 'select' | 'new';

interface StepMedicineProps {
  data: MedicineInput | null;
  onNext: (data: MedicineInput & { existingMedicineId?: number }) => void;
}

export default function StepMedicine({ data, onNext }: StepMedicineProps) {
  const [mode, setMode] = useState<Mode>('select');

  // Inventory list
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // New medicine fields
  const [name, setName] = useState(data?.name ?? '');
  const [form, setForm] = useState<MedicineForm>(data?.form ?? 'TABLET');
  const [strength, setStrength] = useState(data?.strength ?? '');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState(data?.notes ?? '');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load inventory on mount
  useEffect(() => {
    setInventoryLoading(true);
    getMedicines()
      .then((list) => setInventory(Array.isArray(list) ? list : []))
      .catch(() => setInventory([]))
      .finally(() => setInventoryLoading(false));
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow photo library access to upload an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSelectExisting = () => {
    setError(null);
    if (!selectedId) {
      setError('Please select a medicine from the list');
      return;
    }
    const med = inventory.find((m) => m.id === selectedId);
    if (!med) return;
    onNext({
      name: med.name,
      form: med.form,
      strength: med.strength,
      notes: med.notes ?? '',
      existingMedicineId: med.id,
    });
  };

  const handleCreateNew = async () => {
    setError(null);
    if (!name.trim()) { setError('Medicine name is required'); return; }
    if (!strength.trim()) { setError('Strength is required'); return; }

    setSubmitting(true);
    try {
      const created = await createMedicineWithImage({
        name: name.trim(),
        form,
        strength: strength.trim(),
        notes: notes.trim(),
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        imageUri: imageUri ?? undefined,
      });
      onNext({
        name: created.name,
        form: created.form,
        strength: created.strength,
        notes: created.notes ?? '',
        existingMedicineId: created.id,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create medicine');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Medicine Details</Text>

        {/* Mode Toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'select' && styles.modeBtnActive]}
            onPress={() => { setMode('select'); setError(null); }}
          >
            <Text style={[styles.modeBtnText, mode === 'select' && styles.modeBtnTextActive]}>
              Select Existing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'new' && styles.modeBtnActive]}
            onPress={() => { setMode('new'); setError(null); }}
          >
            <Text style={[styles.modeBtnText, mode === 'new' && styles.modeBtnTextActive]}>
              Add New
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── SELECT EXISTING MODE ── */}
        {mode === 'select' && (
          <>
            {inventoryLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#0d9488" />
                <Text style={styles.loadingText}>Loading medicines...</Text>
              </View>
            ) : inventory.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>💊</Text>
                <Text style={styles.emptyText}>No medicines in inventory yet.</Text>
                <Text style={styles.emptySubText}>Switch to "Add New" to create one.</Text>
              </View>
            ) : (
              <View style={styles.inventoryList}>
                {inventory.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.inventoryItem,
                      selectedId === med.id && styles.inventoryItemSelected,
                    ]}
                    onPress={() => setSelectedId(med.id)}
                  >
                    <View style={styles.inventoryIcon}>
                      <Text style={{ fontSize: 20 }}>💊</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inventoryName}>{med.name}</Text>
                      <Text style={styles.inventoryDetail}>
                        {med.strength} • {med.form}
                      </Text>
                    </View>
                    {selectedId === med.id && (
                      <View style={styles.checkCircle}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, (!selectedId || inventoryLoading) && styles.buttonDisabled]}
              onPress={handleSelectExisting}
              disabled={!selectedId || inventoryLoading}
            >
              <Text style={styles.buttonText}>Continue to Dosage →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── ADD NEW MODE ── */}
        {mode === 'new' && (
          <>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Medicine Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Aspirin"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Form Picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Form *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form}
                  onValueChange={(v: any) => setForm(v as MedicineForm)}
                  style={styles.picker}
                >
                  {FORMS.map((f) => (
                    <Picker.Item key={f} label={f} value={f} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Strength */}
            <View style={styles.field}>
              <Text style={styles.label}>Strength *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500mg"
                value={strength}
                onChangeText={setStrength}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Brand */}
            <View style={styles.field}>
              <Text style={styles.label}>Brand (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pfizer, Sun Pharma"
                value={brand}
                onChangeText={setBrand}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="e.g., Used for pain relief and fever"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="e.g., Take with food, may cause drowsiness"
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Image Upload */}
            <View style={styles.field}>
              <Text style={styles.label}>Medicine Image (Optional)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text>
                    <Text style={styles.imagePickerText}>Tap to upload image</Text>
                  </View>
                )}
              </TouchableOpacity>
              {imageUri && (
                <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImage}>
                  <Text style={styles.removeImageText}>✕ Remove image</Text>
                </TouchableOpacity>
              )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleCreateNew}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save & Continue →</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  modeBtnTextActive: { color: '#0d9488' },

  // Inventory list
  inventoryList: { marginBottom: 16 },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  inventoryItemSelected: { borderColor: '#0d9488', backgroundColor: '#f0fdfa' },
  inventoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inventoryName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  inventoryDetail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty / loading
  center: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: '#6b7280', marginTop: 10, fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#374151', fontWeight: '700', fontSize: 16 },
  emptySubText: { color: '#9ca3af', fontSize: 13, marginTop: 4 },

  // Fields
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111827',
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: { height: 52 },

  // Image
  imagePicker: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePickerPlaceholder: { alignItems: 'center', paddingVertical: 24 },
  imagePickerText: { color: '#9ca3af', fontSize: 14 },
  imagePreview: { width: '100%', height: 180, resizeMode: 'cover' },
  removeImage: { marginTop: 8 },
  removeImageText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Error
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },

  // Button
  button: {
    backgroundColor: '#0d9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
