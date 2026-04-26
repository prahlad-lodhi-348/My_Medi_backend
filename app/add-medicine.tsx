import { useAuth } from "@/context/AuthContext";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { analyzeMedicineImage, getReminderSpeech } from '../services/api';

export default function AddMedicine() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const router = useRouter();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!image || !token) return;
    setLoading(true);
    try {
      const response = await analyzeMedicineImage(token, image);
      
      // Attempt to trigger the Speaking AI
      const medId = response.id || response.med_id;
      if (medId) {
        try {
          const speechData = await getReminderSpeech(token, medId);
          if (speechData.speech) {
            Speech.speak(speechData.speech);
          }
        } catch (e) {
          console.log("Could not fetch specific speech data, using default fallback.");
          Speech.speak("Medicine added successfully.");
        }
      } else {
        Speech.speak("Medicine analyzed securely by Neuro AI.");
      }

      Alert.alert("Success", "Medicine uploaded successfully!", [
        { text: "OK", onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload medicine image. Check the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 p-6 justify-center">
        <Text className="text-white text-3xl font-bold tracking-tight mb-2">Add Medicine</Text>
        <Text className="text-slate-400 text-base mb-8">Take a photo of the medicine strip so Neuro AI can analyze it.</Text>

        {!image ? (
          <View className="items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-[30px] mb-8 bg-slate-900">
            <View className="bg-blue-600/20 w-16 h-16 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">📸</Text>
            </View>
            <Text className="text-slate-300 text-lg font-medium text-center">No Image Selected</Text>
          </View>
        ) : (
          <Image source={{ uri: image }} className="w-full h-64 rounded-[30px] mb-8" />
        )}

        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            onPress={takePhoto} 
            className="flex-1 bg-slate-800 p-4 rounded-2xl items-center mr-2"
          >
            <Text className="text-white font-bold">Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={pickImage} 
            className="flex-1 bg-slate-800 p-4 rounded-2xl items-center ml-2"
          >
            <Text className="text-white font-bold">Open Gallery</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <TouchableOpacity 
            onPress={handleAnalyze} 
            disabled={loading}
            className="bg-blue-600 p-4 rounded-2xl items-center mt-4 flex-row justify-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Analyze with Neuro AI</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
