import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { login } from '../api'
import { AuthUser } from '../types'

export default function LoginScreen({ onLogin }: { onLogin: (token: string, user: AuthUser) => Promise<void> }) {
  const [email, setEmail] = useState('admin@dentahub.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await login(email.trim(), password)
      await onLogin(response.token, response.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>✚</Text></View>
      <Text style={styles.brand}>DentaHub</Text>
      <Text style={styles.tagline}>Dental care, beautifully organized.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.help}>Sign in to manage your clinic on the go.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@clinic.com" placeholderTextColor="#9aaab2" />
        <Text style={styles.label}>Password</Text>
        <TextInput secureTextEntry style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#9aaab2" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} disabled={submitting} onPress={submit} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#eff8f7' },
  brandMark: { alignSelf: 'center', width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087f8c', marginBottom: 12 },
  brandMarkText: { color: '#ffffff', fontSize: 30, fontWeight: '800' },
  brand: { color: '#17323d', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#71838e', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 22, shadowColor: '#17323d', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  heading: { color: '#17323d', fontSize: 22, fontWeight: '800' },
  help: { color: '#71838e', fontSize: 14, marginTop: 6, marginBottom: 22 },
  label: { color: '#47606b', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  input: { height: 50, borderWidth: 1, borderColor: '#d8e5e6', borderRadius: 13, paddingHorizontal: 14, color: '#17323d', fontSize: 15, backgroundColor: '#fbfdfd' },
  error: { color: '#c34b57', fontSize: 13, marginTop: 14 },
  button: { height: 52, borderRadius: 14, backgroundColor: '#087f8c', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
})
