import { useRef, useState } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { configureApiBaseUrl, DEFAULT_API_BASE_URL, getApiBaseUrl, login, patientLogin } from '../api'
import { saveApiBaseUrl } from '../storage'
import { AuthUser } from '../types'

const defaultLogo = require('../../assets/dentahub-icon.png')

export default function LoginScreen({ clinicName, logoDataUrl, onLogin }: { clinicName: string; logoDataUrl: string; onLogin: (token: string, user: AuthUser) => Promise<void> }) {
  const [accountType, setAccountType] = useState<'staff' | 'patient'>('staff')
  const [email, setEmail] = useState('admin@dentahub.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState(getApiBaseUrl())
  const [apiError, setApiError] = useState('')
  const [apiSaving, setApiSaving] = useState(false)
  const logoTapCount = useRef(0)
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogoTap = () => {
    logoTapCount.current += 1
    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0
      if (logoTapTimer.current) clearTimeout(logoTapTimer.current)
      setApiBaseUrl(getApiBaseUrl())
      setApiError('')
      setApiSettingsOpen(true)
      return
    }
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current)
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0 }, 1600)
  }

  const saveApiSettings = async () => {
    const value = apiBaseUrl.trim().replace(/\/$/, '')
    try {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an http:// or https:// URL.')
    } catch {
      setApiError('Enter a valid API URL, for example http://192.168.1.10:8080')
      return
    }
    setApiSaving(true)
    try {
      await saveApiBaseUrl(value)
      configureApiBaseUrl(value)
      setApiSettingsOpen(false)
      setError('API URL saved. You can sign in now.')
    } catch {
      setApiError('Unable to save the API URL.')
    } finally {
      setApiSaving(false)
    }
  }

  const resetApiSettings = async () => {
    setApiSaving(true)
    try {
      await saveApiBaseUrl(null)
      configureApiBaseUrl(null)
      setApiBaseUrl(DEFAULT_API_BASE_URL)
      setApiSettingsOpen(false)
      setError('API URL reset to the app default.')
    } finally {
      setApiSaving(false)
    }
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = accountType === 'patient' ? await patientLogin(email.trim(), password) : await login(email.trim(), password)
      await onLogin(response.token, response.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.85} style={styles.brandMark}><Image source={logoDataUrl ? { uri: logoDataUrl } : defaultLogo} accessibilityLabel={`${clinicName} logo`} resizeMode="contain" style={styles.brandImage} /></TouchableOpacity>
      <Text style={styles.brand}>{clinicName}</Text>
      <Text style={styles.tagline}>Dental care, beautifully organized.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.help}>Sign in to {accountType === 'patient' ? 'your patient portal' : 'manage your clinic on the go'}.</Text>
        <View style={styles.switcher}><TouchableOpacity onPress={() => { setAccountType('staff'); setError('') }} style={[styles.switchButton, accountType === 'staff' && styles.switchButtonActive]}><Text style={[styles.switchText, accountType === 'staff' && styles.switchTextActive]}>Staff</Text></TouchableOpacity><TouchableOpacity onPress={() => { setAccountType('patient'); setError('') }} style={[styles.switchButton, accountType === 'patient' && styles.switchButtonActive]}><Text style={[styles.switchText, accountType === 'patient' && styles.switchTextActive]}>Patient</Text></TouchableOpacity></View>
        <Text style={styles.label}>Email</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.input} value={email} onChangeText={setEmail} placeholder="you@clinic.com" placeholderTextColor="#9aaab2" />
        <Text style={styles.label}>Password</Text>
        <TextInput secureTextEntry style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#9aaab2" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} disabled={submitting} onPress={submit} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
      <Modal visible={apiSettingsOpen} transparent animationType="fade" onRequestClose={() => setApiSettingsOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.apiCard}>
          <Text style={styles.apiTitle}>Connection settings</Text>
          <Text style={styles.apiHelp}>Update the backend address used by this mobile app.</Text>
          <Text style={styles.label}>EXPO_PUBLIC_API_BASE_URL</Text>
          <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" value={apiBaseUrl} onChangeText={setApiBaseUrl} style={styles.input} placeholder="http://192.168.1.10:8080" placeholderTextColor="#9aaab2" />
          {apiError ? <Text style={styles.error}>{apiError}</Text> : null}
          <View style={styles.apiActions}><TouchableOpacity disabled={apiSaving} onPress={() => setApiSettingsOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={apiSaving} onPress={() => { void resetApiSettings() }} style={styles.resetButton}><Text style={styles.resetText}>Reset</Text></TouchableOpacity><TouchableOpacity disabled={apiSaving} onPress={() => { void saveApiSettings() }} style={styles.saveButton}><Text style={styles.saveText}>{apiSaving ? 'Saving...' : 'Save'}</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#eff8f7' },
  brandMark: { alignSelf: 'center', width: 88, height: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', marginBottom: 12 },
  brandImage: { width: '100%', height: '100%' },
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
  switcher: { flexDirection: 'row', backgroundColor: '#edf4f4', borderRadius: 12, padding: 3, marginBottom: 5 },
  switchButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  switchButtonActive: { backgroundColor: '#ffffff', shadowColor: '#17323d', shadowOpacity: 0.08, shadowRadius: 5, elevation: 1 },
  switchText: { color: '#71838e', fontSize: 12, fontWeight: '700' },
  switchTextActive: { color: '#087f8c' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(23,50,61,0.38)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  apiCard: { width: '100%', borderRadius: 22, padding: 21, backgroundColor: '#ffffff', shadowColor: '#17323d', shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  apiTitle: { color: '#17323d', fontSize: 20, fontWeight: '800' },
  apiHelp: { color: '#71838e', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 17 },
  apiActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 20 },
  cancelButton: { paddingHorizontal: 10, paddingVertical: 11 },
  cancelText: { color: '#71838e', fontSize: 12, fontWeight: '800' },
  resetButton: { borderRadius: 11, backgroundColor: '#fff0f1', paddingHorizontal: 13, paddingVertical: 11 },
  resetText: { color: '#c34b57', fontSize: 12, fontWeight: '800' },
  saveButton: { borderRadius: 11, backgroundColor: '#087f8c', paddingHorizontal: 15, paddingVertical: 11 },
  saveText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
})
