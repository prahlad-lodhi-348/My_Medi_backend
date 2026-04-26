import { useAuth } from "@/context/AuthContext";
import { Link, Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, token } = useAuth();

  if (token) return <Redirect href="/(tabs)" />;

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Invalid email or password.';
      
      if (error.message) {
        const lowerError = error.message.toLowerCase();
        if (lowerError.includes('email not verified') || lowerError.includes('verify your email')) {
          errorMessage = 'Please verify your email before logging in.';
        } else if (lowerError.includes('invalid email or password')) {
          errorMessage = 'Invalid email or password.';
        }
      }
      
      Alert.alert('Login failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black justify-center p-6"
    >
      <View className="mb-8">
        <Text className="text-white text-4xl font-bold tracking-tight">Welcome Back</Text>
        <Text className="text-slate-400 text-base mt-2">Sign in to continue to MY_medi</Text>
      </View>

      <View className="bg-white p-6 rounded-[30px] shadow-sm">
        <View className="mb-4">
          <Text className="text-slate-900 text-sm font-semibold mb-2 ml-1">Email</Text>
          <TextInput
            className="bg-slate-50 text-slate-900 px-4 py-4 rounded-2xl text-base"
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="mb-6">
          <Text className="text-slate-900 text-sm font-semibold mb-2 ml-1">Password</Text>
          <TextInput
            className="bg-slate-50 text-slate-900 px-4 py-4 rounded-2xl text-base"
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          onPress={handleSignIn}
          disabled={loading}
          className="bg-blue-600 py-4 rounded-2xl items-center flex-row justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>
        
        <View className="mt-6 flex-row justify-center">
          <Text className="text-slate-500">Don't have an account? </Text>
          <Link href="/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
