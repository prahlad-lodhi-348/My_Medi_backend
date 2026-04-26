import { DoseUnit, StockInput } from '@/src/types/phase2';
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

const UNITS: DoseUnit[] = ['TABLET', 'CAPSULE', 'ML'];

interface StepStockProps {
  data: StockInput | null;
  onNext: (data: StockInput) => void;
}

export default function StepStock({ data, onNext }: StepStockProps) {
  const [quantity, setQuantity] = useState(data?.current_quantity.toString() ?? '');
  const [unit, setUnit] = useState<DoseUnit>(data?.unit ?? 'TABLET');
  const [threshold, setThreshold] = useState(
    data?.low_stock_threshold_days.toString() ?? '7'
  );
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Current quantity must be greater than 0');
      return;
    }
    if (!threshold || parseInt(threshold, 10) <= 0) {
      setError('Low stock threshold must be greater than 0');
      return;
    }

    onNext({
      current_quantity: parseFloat(quantity),
      unit,
      low_stock_threshold_days: parseInt(threshold, 10),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Stock Information</Text>

        <Text style={styles.subtitle}>
          Track your medicine inventory to receive alerts when stock is low.
        </Text>

        {/* Quantity Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholderTextColor="#d1d5db"
          />
        </View>

        {/* Unit Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={unit}
              onValueChange={(itemValue: any) => setUnit(itemValue as DoseUnit)}
              style={styles.picker}
            >
              {UNITS.map((u) => (
                <Picker.Item key={u} label={u} value={u} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Threshold Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Low Stock Alert Threshold (Days) *</Text>
          <View style={styles.thresholdInfo}>
            <TextInput
              style={styles.input}
              placeholder="e.g., 7"
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              placeholderTextColor="#d1d5db"
            />
            <Text style={styles.thresholdHelp}>
              Alert when stock runs out in less than {threshold} days
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Smart Alerts</Text>
          <Text style={styles.infoText}>
            Based on your dosage schedule, we'll calculate if stock will run out
            within the threshold days and remind you to reorder.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Next Button */}
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Review & Create</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 18,
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
  thresholdInfo: {
    gap: 8,
  },
  thresholdHelp: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    padding: 12,
    marginVertical: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 16,
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
