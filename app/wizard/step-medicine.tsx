import { MedicineForm, MedicineInput } from '@/src/types/phase2';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const FORMS: MedicineForm[] = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'LIQUID'];

interface StepMedicineProps {
  data: MedicineInput | null;
  onNext: (data: MedicineInput) => void;
}

export default function StepMedicine({ data, onNext }: StepMedicineProps) {
  const [name, setName] = useState(data?.name ?? '');
  const [form, setForm] = useState<MedicineForm>(data?.form ?? 'TABLET');
  const [strength, setStrength] = useState(data?.strength ?? '');
  const [notes, setNotes] = useState(data?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (!name.trim()) {
      setError('Medicine name is required');
      return;
    }
    if (!strength.trim()) {
      setError('Strength is required');
      return;
    }

    onNext({
      name: name.trim(),
      form,
      strength: strength.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Medicine Details</Text>

        {/* Name Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Aspirin"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#d1d5db"
          />
        </View>

        {/* Form Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Form *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form}
              onValueChange={(itemValue: any) => setForm(itemValue as MedicineForm)}
              style={styles.picker}
            >
              {FORMS.map((f) => (
                <Picker.Item key={f} label={f} value={f} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Strength Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Strength *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 500mg"
            value={strength}
            onChangeText={setStrength}
            placeholderTextColor="#d1d5db"
          />
        </View>

        {/* Notes Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g., Take with food, may cause drowsiness"
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor="#d1d5db"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Next Button */}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Continue to Dosage</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
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
  inputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#0d9488',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
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
