import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha no cadastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="mb-10 items-center">
            <Text className="text-3xl font-bold text-indigo-600">DailyMed</Text>
            <Text className="mt-2 text-gray-500">Crie sua conta</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">Nome</Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
                placeholder="Seu nome"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">Senha</Text>
              <TextInput
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <TouchableOpacity
              className="mt-2 rounded-lg bg-indigo-600 py-3.5 items-center"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-semibold text-white">Criar conta</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-500">Já tem conta? </Text>
            <Link href="/(auth)/login">
              <Text className="font-semibold text-indigo-600">Entrar</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
