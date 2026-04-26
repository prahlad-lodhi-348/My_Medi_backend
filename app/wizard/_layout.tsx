import {
  DoseTimeInput,
  MedicineInput,
  RegimenWizardPayload,
  StockInput,
} from '@/src/types/phase2';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StepDoses from './step-doses';
import StepMedicine from './step-medicine';
import StepReview from './step-review';
import StepStock from './step-stock';

type WizardStep = 'medicine' | 'doses' | 'stock' | 'review';

const STEPS: WizardStep[] = ['medicine', 'doses', 'stock', 'review'];

interface WizardData {
  medicine: MedicineInput | null;
  doses: DoseTimeInput[];
  stock: StockInput | null;
  start_date: string;
  end_date: string | null;   // ✅ Added
}

const initialData: WizardData = {
  medicine: null,
  doses: [],
  stock: null,
  start_date: new Date().toISOString().split('T')[0],
  end_date: null,            // ✅ Default: no end date
};

export default function WizardLayout() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('medicine');
  const [data, setData] = useState<WizardData>(initialData);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = validateStep(currentStep, data);

  function validateStep(step: WizardStep, wizardData: WizardData): boolean {
    switch (step) {
      case 'medicine': return !!wizardData.medicine;
      case 'doses': return wizardData.doses.length > 0;
      case 'stock': return !!wizardData.stock;
      case 'review': return true;
      default: return false;
    }
  }

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (canGoBack) setCurrentStep(STEPS[currentStepIndex - 1]);
  };

  const handleMedicineChange = (medicine: MedicineInput) =>
    setData({ ...data, medicine });

  const handleDosesChange = (doses: DoseTimeInput[]) =>
    setData({ ...data, doses });

  const handleStockChange = (stock: StockInput) =>
    setData({ ...data, stock });

  const handleDateChange = (date: string) =>
    setData({ ...data, start_date: date });

  const handleEndDateChange = (date: string | null) =>   // ✅ Added
    setData({ ...data, end_date: date });

  const getPayload = (): RegimenWizardPayload => ({
    start_date: data.start_date,
    end_date: data.end_date ?? undefined,                // ✅ Pass to payload
    medicine: data.medicine!,
    dose_times: data.doses,
    stock: data.stock!,
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: `Add Medicine - Step ${currentStepIndex + 1} of ${STEPS.length}`,
          headerStyle: { backgroundColor: '#fafafa' },
          headerTintColor: '#0d9488',
          headerLeft: () =>
            canGoBack ? (
              <TouchableOpacity onPress={goBack} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Back</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <View style={styles.container}>
        {/* Step Indicators */}
        <View style={styles.stepIndicators}>
          {STEPS.map((step, idx) => (
            <View key={step} style={styles.stepIndicatorContainer}>
              <View style={[styles.stepBubble, idx <= currentStepIndex && styles.stepBubbleActive]}>
                <Text style={[styles.stepBubbleText, idx <= currentStepIndex && styles.stepBubbleTextActive]}>
                  {idx + 1}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, idx < currentStepIndex && styles.stepLineActive]} />
              )}
            </View>
          ))}
        </View>

        {/* Step Content */}
        <View style={styles.stepContent}>
          {currentStep === 'medicine' && (
            <StepMedicine
              data={data.medicine}
              onNext={(medicine) => { handleMedicineChange(medicine); goNext(); }}
            />
          )}
          {currentStep === 'doses' && (
            <StepDoses
              data={data.doses}
              onNext={(doses) => { handleDosesChange(doses); goNext(); }}
            />
          )}
          {currentStep === 'stock' && (
            <StepStock
              data={data.stock}
              onNext={(stock) => { handleStockChange(stock); goNext(); }}
            />
          )}
          {currentStep === 'review' && (
            <StepReview
              data={getPayload()}
              onDateChange={handleDateChange}
              onEndDateChange={handleEndDateChange}  // ✅ Added
            />
          )}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {canGoBack && (
            <TouchableOpacity style={styles.buttonSecondary} onPress={goBack}>
              <Text style={styles.buttonSecondaryText}>Previous</Text>
            </TouchableOpacity>
          )}
          {currentStepIndex < STEPS.length - 1 && (
            <TouchableOpacity
              style={[styles.button, !canGoForward && styles.buttonDisabled]}
              onPress={goNext}
              disabled={!canGoForward}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepIndicatorContainer: { alignItems: 'center' },
  stepBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  stepBubbleActive: { backgroundColor: '#0d9488' },
  stepBubbleText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  stepBubbleTextActive: { color: '#fff' },
  stepLine: { width: 24, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#0d9488' },
  stepContent: { flex: 1 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    flex: 1,
    backgroundColor: '#0d9488',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  headerButton: { paddingHorizontal: 12, paddingVertical: 8 },
  headerButtonText: { color: '#0d9488', fontSize: 14, fontWeight: '500' },
});