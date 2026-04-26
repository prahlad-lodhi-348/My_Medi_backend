import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleSignUp = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // await register(username, email, password, confirmPassword);
      // Alert.alert(
      //   'Registration successful',
      //   'Please check your email to verify your account.',
      //   [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
      // );
      await register(username, email, password, confirmPassword);
          Alert.alert(
           'Registration successful',
           'Please check your email to verify your account.',
            [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
);
    } catch (error: any) {
      Alert.alert('Registration failed', error.message || 'Something went wrong');
      console.error(error);
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
        <Text className="text-white text-4xl font-bold tracking-tight">Create Account</Text>
        <Text className="text-slate-400 text-base mt-2">Join MY_medi to track your doses</Text>
      </View>

      <View className="bg-white p-6 rounded-[30px] shadow-sm">
        <View className="mb-4">
          <Text className="text-slate-900 text-sm font-semibold mb-2 ml-1">Username</Text>
          <TextInput
            className="bg-slate-50 text-slate-900 px-4 py-4 rounded-2xl text-base"
            placeholder="Username"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
        </View>

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
            placeholder="Create a password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View className="mb-6">
          <Text className="text-slate-900 text-sm font-semibold mb-2 ml-1">Confirm Password</Text>
          <TextInput
            className="bg-slate-50 text-slate-900 px-4 py-4 rounded-2xl text-base"
            placeholder="Confirm your password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity 
          onPress={handleSignUp}
          disabled={loading}
          className="bg-blue-600 py-4 rounded-2xl items-center flex-row justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign Up</Text>
          )}
        </TouchableOpacity>
        
        <View className="mt-6 flex-row justify-center">
          <Text className="text-slate-500">Already have an account? </Text>
          <Link href="/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
